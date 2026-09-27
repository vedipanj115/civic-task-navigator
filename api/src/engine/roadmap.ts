import type {
  ApplicabilityRule,
  Document,
  JourneyAnswers,
  Prerequisite,
  Procedure,
  Roadmap,
  RoadmapStep,
  SourceHealth,
  Step,
  StepStatus,
} from '@cn/shared';

import { findCycle } from '../lib/dag';
import { evaluateApplicability } from './applicability';
import { DataIntegrityError } from './errors';
import { assignStages, longestPath } from './graph';

export interface RoadmapEngineInput {
  journeyId: string;
  procedure: Procedure;
  /** Every Prerequisite whose `stepId` belongs to this procedure's steps. */
  prerequisites: Prerequisite[];
  /** Every ApplicabilityRule whose `stepId` belongs to this procedure's steps. */
  applicabilityRules: ApplicabilityRule[];
  /** The full document catalogue, for resolving `requiresDocumentIds` sources. */
  documents: Document[];
  answers: JourneyAnswers;
  completedStepIds: string[];
  /**
   * sourceHealth is date-dependent (docs/03 § 7, docs/05 § 4) and is deliberately
   * NOT computed in here — the engine reads no clock. The caller (the /v1/roadmap
   * route) computes each applicable step's health against `new Date()` and passes
   * the result in, keeping this function a pure fn of its arguments.
   */
  sourceHealthByStepId: Map<string, SourceHealth>;
}

/**
 * docs/03-DEPENDENCY-SPEC.md § 1, the whole pipeline. Pure: no HTTP, no
 * filesystem, no Date/clock reads, no randomness — same input, same output.
 * Throws DataIntegrityError if the applicability-pruned graph has a cycle.
 */
export function buildRoadmap(input: RoadmapEngineInput): Roadmap {
  const { journeyId, procedure, prerequisites, applicabilityRules, documents, answers, completedStepIds } = input;

  // --- 2. applicability -----------------------------------------------------
  const { applicableSteps, excluded } = evaluateApplicability(procedure.steps, applicabilityRules, answers);
  const applicableIds = applicableSteps.map((step) => step.stepId);
  const applicableIdSet = new Set(applicableIds);
  const stepById = new Map(applicableSteps.map((step) => [step.stepId, step]));

  // --- 3. prune edges pointing to/from excluded steps ------------------------
  const prunedPrerequisites = prerequisites.filter(
    (p) => applicableIdSet.has(p.stepId) && applicableIdSet.has(p.dependsOnStepId),
  );
  const dagEdges = prunedPrerequisites.map((p) => ({ from: p.dependsOnStepId, to: p.stepId }));

  // --- 4. validate the pruned DAG --------------------------------------------
  const cycle = findCycle(applicableIds, dagEdges);
  if (cycle) {
    throw new DataIntegrityError(cycle);
  }

  // --- 5. stage assignment ----------------------------------------------------
  const stageById = assignStages(applicableIds, dagEdges);

  // Per-step prerequisite/dependent lookups over the pruned graph.
  const prerequisitesOf = new Map<string, Prerequisite[]>();
  for (const id of applicableIds) prerequisitesOf.set(id, []);
  for (const p of prunedPrerequisites) prerequisitesOf.get(p.stepId)?.push(p);

  // --- 6. status, blockedBy, unlocks -------------------------------------------
  const completedSet = new Set(completedStepIds);

  const statusById = new Map<string, StepStatus>();
  const blockedByById = new Map<string, RoadmapStep['blockedBy']>();

  for (const id of applicableIds) {
    const incompleteBlockers = (prerequisitesOf.get(id) ?? []).filter((p) => !completedSet.has(p.dependsOnStepId));

    blockedByById.set(
      id,
      incompleteBlockers.map((p) => ({
        stepId: p.dependsOnStepId,
        shortTitle: stepById.get(p.dependsOnStepId)?.shortTitle ?? p.dependsOnStepId,
        reason: p.reason,
      })),
    );

    if (completedSet.has(id)) {
      statusById.set(id, 'COMPLETED');
    } else {
      statusById.set(id, incompleteBlockers.length > 0 ? 'BLOCKED' : 'AVAILABLE');
    }
  }

  // unlocks(X): every BLOCKED step Y whose only remaining blocker is X —
  // i.e. completing X right now would flip Y to AVAILABLE.
  const unlocksById = new Map<string, string[]>(applicableIds.map((id) => [id, []]));
  for (const id of applicableIds) {
    if (statusById.get(id) !== 'BLOCKED') continue;
    const blockers = blockedByById.get(id) ?? [];
    if (blockers.length === 1) {
      unlocksById.get(blockers[0]!.stepId)?.push(id);
    }
  }
  for (const list of unlocksById.values()) list.sort();

  // --- missingDocumentIds: requiresDocumentIds not yet produced ----------------
  const documentById = new Map(documents.map((d) => [d.documentId, d]));

  function missingDocumentIdsFor(step: Step): string[] {
    return step.requiresDocumentIds.filter((docId) => {
      const document = documentById.get(docId);
      if (!document || document.source !== 'ISSUED_BY_STEP' || !document.issuedByStepId) return false;
      return statusById.get(document.issuedByStepId) !== 'COMPLETED';
    });
  }

  // --- stages: group + sort deterministically (docs/03 § 5) --------------------
  const stepIdsByStage = new Map<number, string[]>();
  for (const id of applicableIds) {
    const stage = stageById.get(id) ?? 1;
    const list = stepIdsByStage.get(stage);
    if (list) list.push(id);
    else stepIdsByStage.set(stage, [id]);
  }

  const stageNumbers = [...stepIdsByStage.keys()].sort((a, b) => a - b);
  const stages = stageNumbers.map((stage) => {
    const stepIds = stepIdsByStage.get(stage)!;
    stepIds.sort((a, b) => {
      const stepA = stepById.get(a)!;
      const stepB = stepById.get(b)!;
      if (stepB.processingDays.max !== stepA.processingDays.max) return stepB.processingDays.max - stepA.processingDays.max;
      if (stepA.feeInr !== stepB.feeInr) return stepA.feeInr - stepB.feeInr;
      return a.localeCompare(b);
    });
    return { stage, stepIds };
  });

  const steps: RoadmapStep[] = stages.flatMap(({ stage, stepIds }) =>
    stepIds.map((id) => {
      const step = stepById.get(id)!;
      return {
        step,
        status: statusById.get(id)!,
        stage,
        blockedBy: blockedByById.get(id) ?? [],
        unlocks: unlocksById.get(id) ?? [],
        missingDocumentIds: missingDocumentIdsFor(step),
        sourceHealth: input.sourceHealthByStepId.get(id) ?? 'STALE',
      };
    }),
  );

  // --- 7. totals ----------------------------------------------------------------
  const totalFeeInr = applicableSteps.reduce((sum, step) => sum + step.feeInr, 0);
  const sequentialDaysMax = applicableSteps.reduce((sum, step) => sum + step.processingDays.max, 0);
  const criticalPathDaysMin = longestPath(applicableIds, dagEdges, (id) => stepById.get(id)!.processingDays.min);
  const criticalPathDaysMax = longestPath(applicableIds, dagEdges, (id) => stepById.get(id)!.processingDays.max);
  const distinctDepartments = new Set(applicableSteps.map((s) => s.department)).size;
  const distinctSourceUrls = new Set(applicableSteps.map((s) => s.sourceUrl)).size;

  return {
    journeyId,
    procedure: {
      procedureId: procedure.procedureId,
      name: procedure.name,
      city: procedure.city,
      summary: procedure.summary,
    },
    stages,
    steps,
    excluded,
    totals: {
      applicableStepCount: applicableSteps.length,
      excludedStepCount: excluded.length,
      totalFeeInr,
      criticalPathDaysMin,
      criticalPathDaysMax,
      sequentialDaysMax,
      distinctDepartments,
      distinctSourceUrls,
    },
  };
}
