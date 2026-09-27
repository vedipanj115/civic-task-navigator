import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { ApplicabilityRule, JourneyAnswers, Prerequisite, Procedure, SourceHealth, Step } from '@cn/shared';

import { loadDataset } from '../../data/loader';
import { DataIntegrityError } from '../../engine/errors';
import { buildRoadmap } from '../../engine/roadmap';

// ---------------------------------------------------------------------------
// The demo-dataset fixture — docs/03-DEPENDENCY-SPEC.md § 8's worked example,
// reproduced as an M2 test fixture (fictional data, see the fixture's own
// summary field).
// ---------------------------------------------------------------------------

const fixtureDir = fileURLToPath(new URL('../fixtures/demo-dataset', import.meta.url));
const dataset = loadDataset({ dataDir: fixtureDir });
const procedure = dataset.procedures[0]!;

const demoAnswers: JourneyAnswers = {
  city: 'MUMBAI',
  entityType: 'PROPRIETORSHIP',
  activity: 'FOOD_SERVICE',
  annualTurnoverInr: 1800000,
  premisesType: 'RENTED',
  seatingCapacity: 20,
  employeeCount: 3,
};

const freshHealth = new Map<string, SourceHealth>(procedure.steps.map((s) => [s.stepId, 'FRESH']));

function runDemo(completedStepIds: string[]) {
  return buildRoadmap({
    journeyId: 'jny_test',
    procedure,
    prerequisites: dataset.prerequisites,
    applicabilityRules: dataset.applicabilityRules,
    documents: dataset.documents,
    answers: demoAnswers,
    completedStepIds,
    sourceHealthByStepId: freshHealth,
  });
}

test('worked-example totals match docs/03 § 8 exactly', () => {
  const roadmap = runDemo([]);

  assert.equal(roadmap.totals.applicableStepCount, 6);
  assert.equal(roadmap.totals.excludedStepCount, 2);
  assert.equal(roadmap.totals.totalFeeInr, 2500);
  assert.equal(roadmap.totals.criticalPathDaysMax, 36); // PAN 15 -> Gumasta 7 -> FSSAI 14
  assert.equal(roadmap.totals.criticalPathDaysMin, 17);
  assert.equal(roadmap.totals.sequentialDaysMax, 43); // 15+3+7+1+14+3
  assert.equal(roadmap.totals.distinctDepartments, 6);
  assert.equal(roadmap.totals.distinctSourceUrls, 6);
  assert.ok(roadmap.totals.sequentialDaysMax >= roadmap.totals.criticalPathDaysMax); // Invariant R1

  assert.deepEqual(
    roadmap.stages.map((s) => [...s.stepIds].sort()),
    [
      ['step_pan', 'step_rent'],
      ['step_gumasta', 'step_udyam'],
      ['step_bank', 'step_fssai'],
    ],
  );

  assert.deepEqual(
    roadmap.excluded.map((e) => e.stepId).sort(),
    ['step_company_incorporation', 'step_gst'],
  );
  const gst = roadmap.excluded.find((e) => e.stepId === 'step_gst')!;
  assert.match(gst.reason, /below/i);
});

test('deterministic stage sort order: processingDays.max desc, feeInr asc, stepId asc', () => {
  const roadmap = runDemo([]);
  const stage1 = roadmap.stages.find((s) => s.stage === 1)!;
  // PAN (max 15) sorts before rent (max 3).
  assert.deepEqual(stage1.stepIds, ['step_pan', 'step_rent']);
});

test('initial statuses, blockedBy and unlocks with nothing completed', () => {
  const roadmap = runDemo([]);
  const byId = new Map(roadmap.steps.map((s) => [s.step.stepId, s]));

  assert.equal(byId.get('step_pan')!.status, 'AVAILABLE');
  assert.equal(byId.get('step_rent')!.status, 'AVAILABLE');
  assert.equal(byId.get('step_gumasta')!.status, 'BLOCKED');
  assert.equal(byId.get('step_udyam')!.status, 'BLOCKED');
  assert.equal(byId.get('step_fssai')!.status, 'BLOCKED');
  assert.equal(byId.get('step_bank')!.status, 'BLOCKED');

  // Invariant R2: every BLOCKED step has at least one blockedBy entry.
  for (const step of roadmap.steps) {
    if (step.status === 'BLOCKED') assert.ok(step.blockedBy.length > 0);
  }

  assert.deepEqual(byId.get('step_udyam')!.blockedBy.map((b) => b.stepId), ['step_pan']);
  assert.deepEqual(byId.get('step_pan')!.unlocks, ['step_udyam']);
  assert.deepEqual(byId.get('step_gumasta')!.unlocks, ['step_fssai']);
});

test('demo\'s second beat: completing Gumasta unlocks both FSSAI and bank', () => {
  const before = runDemo(['step_pan', 'step_rent', 'step_udyam']);
  const beforeById = new Map(before.steps.map((s) => [s.step.stepId, s]));
  assert.equal(beforeById.get('step_gumasta')!.status, 'AVAILABLE');
  assert.equal(beforeById.get('step_fssai')!.status, 'BLOCKED');
  assert.equal(beforeById.get('step_bank')!.status, 'BLOCKED');
  assert.deepEqual([...beforeById.get('step_gumasta')!.unlocks].sort(), ['step_bank', 'step_fssai']);

  const after = runDemo(['step_pan', 'step_rent', 'step_udyam', 'step_gumasta']);
  const afterById = new Map(after.steps.map((s) => [s.step.stepId, s]));
  assert.equal(afterById.get('step_gumasta')!.status, 'COMPLETED');
  assert.equal(afterById.get('step_fssai')!.status, 'AVAILABLE');
  assert.equal(afterById.get('step_bank')!.status, 'AVAILABLE');

  // Stage numbers must never change when a step is completed.
  const stageSignature = (r: typeof before) => r.stages.map((s) => `${s.stage}:${[...s.stepIds].sort().join(',')}`);
  assert.deepEqual(stageSignature(before), stageSignature(after));
});

test('missingDocumentIds: ISSUED_BY_STEP documents are missing until their step completes; CITIZEN_HELD never is', () => {
  const roadmap = runDemo([]);
  const bank = roadmap.steps.find((s) => s.step.stepId === 'step_bank')!;
  assert.deepEqual([...bank.missingDocumentIds].sort(), ['doc_gumasta_certificate', 'doc_pan']);

  const afterPanAndGumasta = runDemo(['step_pan', 'step_gumasta']);
  const bank2 = afterPanAndGumasta.steps.find((s) => s.step.stepId === 'step_bank')!;
  assert.deepEqual(bank2.missingDocumentIds, []);

  const rent = roadmap.steps.find((s) => s.step.stepId === 'step_rent')!;
  assert.deepEqual(rent.missingDocumentIds, []); // requires a CITIZEN_HELD document
});

test('excluded steps never appear in blockedBy, and completed steps still count toward totalFeeInr', () => {
  const roadmap = runDemo(['step_pan']);
  for (const step of roadmap.steps) {
    for (const blocker of step.blockedBy) {
      assert.ok(!roadmap.excluded.some((e) => e.stepId === blocker.stepId));
    }
  }
  // PAN (fee 0) completed; totalFeeInr still counts every applicable step's fee.
  assert.equal(roadmap.totals.totalFeeInr, 2500);
});

// ---------------------------------------------------------------------------
// Hand-built procedures for pruning / cycle-detection edge cases.
// ---------------------------------------------------------------------------

function makeStep(stepId: string, overrides: Partial<Step> = {}): Step {
  return {
    stepId,
    procedureId: 'proc_cycle_test',
    title: stepId,
    shortTitle: stepId,
    description: 'desc',
    issuingOffice: 'office',
    department: 'dept',
    feeInr: 0,
    processingDays: { min: 1, max: 1 },
    modeOnline: true,
    sourceUrl: 'https://example.test/' + stepId,
    verifiedOn: '2026-01-01',
    producesDocumentIds: [],
    requiresDocumentIds: [],
    ...overrides,
  };
}

function makeProcedure(steps: Step[]): Procedure {
  return {
    procedureId: 'proc_cycle_test',
    name: 'Cycle test procedure',
    synonyms: [],
    city: 'MUMBAI',
    appliesTo: { entityTypes: ['PROPRIETORSHIP'], activities: ['SERVICES'] },
    summary: 'summary',
    steps,
  };
}

const baseAnswers: JourneyAnswers = {
  city: 'MUMBAI',
  entityType: 'PROPRIETORSHIP',
  activity: 'SERVICES',
  annualTurnoverInr: 500000,
  premisesType: 'OWNED',
};

test('a cycle only among excluded steps is pruned away and does not throw', () => {
  const stepA = makeStep('a');
  const stepB = makeStep('b'); // excluded below
  const stepC = makeStep('c');
  const procedure = makeProcedure([stepA, stepB, stepC]);

  // b -> c -> b would be a cycle, but b is excluded, so the edges touching
  // it get pruned before cycle detection ever runs (docs/03 § 3-4).
  const prerequisites: Prerequisite[] = [
    { stepId: 'c', dependsOnStepId: 'b', type: 'SEQUENCE', reason: 'r', sourceUrl: 'https://example.test' },
    { stepId: 'b', dependsOnStepId: 'c', type: 'SEQUENCE', reason: 'r', sourceUrl: 'https://example.test' },
    { stepId: 'a', dependsOnStepId: 'c', type: 'SEQUENCE', reason: 'r', sourceUrl: 'https://example.test' },
  ];
  const applicabilityRules: ApplicabilityRule[] = [
    { stepId: 'b', field: 'premisesType', operator: 'EQ', value: 'RENTED', exclusionReason: 'premises must be rented' },
  ];

  const roadmap = buildRoadmap({
    journeyId: 'jny_cycle_pruned',
    procedure,
    prerequisites,
    applicabilityRules,
    documents: [],
    answers: baseAnswers,
    completedStepIds: [],
    sourceHealthByStepId: new Map([
      ['a', 'FRESH'],
      ['c', 'FRESH'],
    ]),
  });

  assert.deepEqual(
    roadmap.excluded.map((e) => e.stepId),
    ['b'],
  );
  assert.equal(roadmap.totals.applicableStepCount, 2);
});

test('a genuine cycle among applicable steps throws DataIntegrityError naming the cycle', () => {
  const stepA = makeStep('a');
  const stepB = makeStep('b');
  const procedure = makeProcedure([stepA, stepB]);

  const prerequisites: Prerequisite[] = [
    { stepId: 'a', dependsOnStepId: 'b', type: 'SEQUENCE', reason: 'r', sourceUrl: 'https://example.test' },
    { stepId: 'b', dependsOnStepId: 'a', type: 'SEQUENCE', reason: 'r', sourceUrl: 'https://example.test' },
  ];

  assert.throws(
    () =>
      buildRoadmap({
        journeyId: 'jny_cycle',
        procedure,
        prerequisites,
        applicabilityRules: [],
        documents: [],
        answers: baseAnswers,
        completedStepIds: [],
        sourceHealthByStepId: new Map([
          ['a', 'FRESH'],
          ['b', 'FRESH'],
        ]),
      }),
    (err: unknown) =>
      err instanceof DataIntegrityError && err.cycle.includes('a') && err.cycle.includes('b'),
  );
});
