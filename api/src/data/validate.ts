import type { ApplicabilityRule, Document, Prerequisite, Procedure } from '@cn/shared';

import { findCycle } from '../lib/dag';

/** The minimal shape validateDataset needs — same as Dataset, spelled out
 * here so validation has no dependency on how a Dataset was assembled. */
export interface ValidatableDataset {
  procedures: Procedure[];
  documents: Document[];
  prerequisites: Prerequisite[];
  applicabilityRules: ApplicabilityRule[];
}

export class DataValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(
      `Dataset failed boot-time validation with ${issues.length} issue(s):\n` +
        issues.map((issue) => `  - ${issue}`).join('\n'),
    );
    this.name = 'DataValidationError';
    this.issues = issues;
  }
}

/**
 * Pure validation function. Reused for both the temporary test fixture and
 * the eventual M3 production dataset because it only ever inspects the
 * assembled Dataset shape — it has no idea where the data came from.
 *
 * Returns the list of problems found; an empty array means the dataset is
 * valid. Never repairs or invents data: every problem is reported, none
 * are silently patched, and the cycle check never partially orders and
 * carries on (docs/03-DEPENDENCY-SPEC.md § 4).
 *
 * Enforces, in order:
 *  1. Procedure/step relationship validity (unique ids, correct linking).
 *  2. Invariant S1 (docs/02 § 4) — sourceUrl and verifiedOn are mandatory.
 *  3. requiresDocumentIds / producesDocumentIds reference real documents
 *     (docs/03 § 4; an unresolvable producesDocumentIds is the "orphan
 *     document" case named in docs/04 § 4's DATA_INTEGRITY_ERROR row).
 *  4. Every ISSUED_BY_STEP document has a valid, consistent producing step
 *     (docs/03 § 4).
 *  5. Prerequisite references point to valid steps.
 *  6. Invariant P1 (docs/02 § 5) — the prerequisite graph is a DAG.
 */
export function validateDataset(dataset: ValidatableDataset): string[] {
  const issues: string[] = [];

  // --- 1. Procedure/step relationship validity ----------------------------

  const procedureIds = new Set<string>();
  for (const procedure of dataset.procedures) {
    if (procedureIds.has(procedure.procedureId)) {
      issues.push(`Duplicate procedureId "${procedure.procedureId}".`);
    }
    procedureIds.add(procedure.procedureId);
  }

  const stepIds = new Set<string>();
  const producesIndex = new Map<string, string[]>(); // stepId -> producesDocumentIds

  for (const procedure of dataset.procedures) {
    for (const step of procedure.steps) {
      if (stepIds.has(step.stepId)) {
        issues.push(`Duplicate stepId "${step.stepId}".`);
      }
      stepIds.add(step.stepId);
      producesIndex.set(step.stepId, step.producesDocumentIds);

      if (step.procedureId !== procedure.procedureId) {
        issues.push(
          `Step "${step.stepId}" has procedureId "${step.procedureId}" but is ` +
            `listed under procedure "${procedure.procedureId}".`,
        );
      }
      if (!procedureIds.has(step.procedureId)) {
        issues.push(`Step "${step.stepId}" references unknown procedureId "${step.procedureId}".`);
      }

      // --- 2. Invariant S1 --------------------------------------------
      if (!step.sourceUrl || step.sourceUrl.trim() === '') {
        issues.push(`Step "${step.stepId}" is missing a sourceUrl.`);
      }
      if (!step.verifiedOn || step.verifiedOn.trim() === '') {
        issues.push(`Step "${step.stepId}" is missing verifiedOn.`);
      } else if (Number.isNaN(Date.parse(step.verifiedOn))) {
        issues.push(`Step "${step.stepId}" has a verifiedOn that is not a valid date: "${step.verifiedOn}".`);
      }
    }
  }

  // --- Document lookups -----------------------------------------------------

  const documentById = new Map<string, Document>();
  for (const document of dataset.documents) {
    if (documentById.has(document.documentId)) {
      issues.push(`Duplicate documentId "${document.documentId}".`);
    }
    documentById.set(document.documentId, document);
  }

  // --- 3. requiresDocumentIds / producesDocumentIds must exist -------------

  for (const procedure of dataset.procedures) {
    for (const step of procedure.steps) {
      for (const docId of step.requiresDocumentIds) {
        if (!documentById.has(docId)) {
          issues.push(`Step "${step.stepId}" requires unknown document "${docId}".`);
        }
      }
      for (const docId of step.producesDocumentIds) {
        if (!documentById.has(docId)) {
          issues.push(`Step "${step.stepId}" produces unknown document "${docId}" (orphan document).`);
        }
      }
    }
  }

  // --- 4. ISSUED_BY_STEP documents need a valid, consistent producing step -

  for (const document of dataset.documents) {
    if (document.source !== 'ISSUED_BY_STEP') continue;

    if (!document.issuedByStepId) {
      issues.push(`Document "${document.documentId}" is ISSUED_BY_STEP but has no issuedByStepId.`);
      continue;
    }
    if (!stepIds.has(document.issuedByStepId)) {
      issues.push(
        `Document "${document.documentId}" has issuedByStepId "${document.issuedByStepId}", which is not a known step.`,
      );
      continue;
    }
    const produced = producesIndex.get(document.issuedByStepId) ?? [];
    if (!produced.includes(document.documentId)) {
      issues.push(
        `Document "${document.documentId}" claims issuedByStepId "${document.issuedByStepId}", but that ` +
          `step's producesDocumentIds does not list it.`,
      );
    }
  }

  // --- 5. Prerequisite references must point to valid steps ---------------

  for (const prerequisite of dataset.prerequisites) {
    if (!stepIds.has(prerequisite.stepId)) {
      issues.push(`Prerequisite references unknown stepId "${prerequisite.stepId}".`);
    }
    if (!stepIds.has(prerequisite.dependsOnStepId)) {
      issues.push(
        `Prerequisite for "${prerequisite.stepId}" references unknown dependsOnStepId "${prerequisite.dependsOnStepId}".`,
      );
    }
  }

  // --- 6. Invariant P1 — the prerequisite graph must be a DAG --------------

  const edges = dataset.prerequisites
    .filter((p) => stepIds.has(p.stepId) && stepIds.has(p.dependsOnStepId))
    .map((p) => ({ from: p.dependsOnStepId, to: p.stepId }));
  const cycle = findCycle([...stepIds], edges);
  if (cycle) {
    issues.push(`Prerequisite graph has a cycle: ${cycle.join(' -> ')}.`);
  }

  return issues;
}

/** Throws DataValidationError if validateDataset finds any issues. */
export function assertValidDataset(dataset: ValidatableDataset): void {
  const issues = validateDataset(dataset);
  if (issues.length > 0) {
    throw new DataValidationError(issues);
  }
}
