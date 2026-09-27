import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Document, Prerequisite, Procedure, Step } from '@cn/shared';

import { loadDataset } from '../data/loader';
import { assertValidDataset, DataValidationError, validateDataset } from '../data/validate';

const fixtureDir = fileURLToPath(new URL('./fixtures/dataset', import.meta.url));

// ---------------------------------------------------------------------------
// loadDataset against the real (fixture) files on disk
// ---------------------------------------------------------------------------

test('loadDataset loads the fixture and assembles a valid Dataset', () => {
  const dataset = loadDataset({ dataDir: fixtureDir });

  assert.equal(dataset.procedures.length, 1);
  assert.equal(dataset.procedures[0]!.steps.length, 2);
  assert.equal(dataset.documents.length, 1);
  assert.equal(dataset.prerequisites.length, 1);
});

test('loadDataset derives dataVersion from the latest verifiedOn in the data', () => {
  const dataset = loadDataset({ dataDir: fixtureDir });
  // Fixture steps are verified 2026-01-01 and 2026-01-02.
  assert.equal(dataset.dataVersion, '2026-01-02');
});

test('loadDataset throws when the directory does not exist (fails loudly, no repair)', () => {
  assert.throws(() => loadDataset({ dataDir: path.join(fixtureDir, 'does-not-exist') }));
});

// ---------------------------------------------------------------------------
// validateDataset against hand-built in-memory datasets — one rule at a time.
// These do not touch the fixture files at all, which is the point: the
// same validation logic must work for any dataset, fixture or real.
// ---------------------------------------------------------------------------

function makeValidStep(overrides: Partial<Step> = {}): Step {
  return {
    stepId: 'step_a',
    procedureId: 'proc_x',
    title: 'A',
    shortTitle: 'A',
    description: 'desc',
    issuingOffice: 'office',
    department: 'dept',
    feeInr: 0,
    processingDays: { min: 1, max: 1 },
    modeOnline: true,
    sourceUrl: 'https://example.test/a',
    verifiedOn: '2026-01-01',
    producesDocumentIds: [],
    requiresDocumentIds: [],
    ...overrides,
  };
}

function makeValidProcedure(steps: Step[], overrides: Partial<Procedure> = {}): Procedure {
  return {
    procedureId: 'proc_x',
    name: 'X',
    synonyms: [],
    city: 'MUMBAI',
    appliesTo: { entityTypes: ['PROPRIETORSHIP'], activities: ['SERVICES'] },
    summary: 'summary',
    steps,
    ...overrides,
  };
}

test('a fully valid minimal dataset produces no issues', () => {
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep()])],
    documents: [],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.deepEqual(issues, []);
});

test('rejects a step missing sourceUrl', () => {
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep({ sourceUrl: '' })])],
    documents: [],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('missing a sourceUrl')));
});

test('rejects a step missing verifiedOn', () => {
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep({ verifiedOn: '' })])],
    documents: [],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('missing verifiedOn')));
});

test('rejects a step with an unparseable verifiedOn', () => {
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep({ verifiedOn: 'not-a-date' })])],
    documents: [],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('not a valid date')));
});

test('rejects a requiresDocumentIds entry that does not exist', () => {
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep({ requiresDocumentIds: ['doc_missing'] })])],
    documents: [],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('unknown document "doc_missing"')));
});

test('rejects a producesDocumentIds entry that does not exist (orphan document)', () => {
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep({ producesDocumentIds: ['doc_missing'] })])],
    documents: [],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('orphan document')));
});

test('rejects an ISSUED_BY_STEP document with no issuedByStepId', () => {
  const document: Document = { documentId: 'doc_orphan', name: 'Orphan doc', source: 'ISSUED_BY_STEP' };
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep()])],
    documents: [document],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('no issuedByStepId')));
});

test('rejects an ISSUED_BY_STEP document whose issuedByStepId is not a known step', () => {
  const document: Document = {
    documentId: 'doc_ghost',
    name: 'Ghost doc',
    source: 'ISSUED_BY_STEP',
    issuedByStepId: 'step_ghost',
  };
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep()])],
    documents: [document],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('is not a known step')));
});

test("rejects a document whose issuedByStepId step doesn't actually list it as produced", () => {
  const document: Document = {
    documentId: 'doc_mismatch',
    name: 'Mismatch doc',
    source: 'ISSUED_BY_STEP',
    issuedByStepId: 'step_a',
  };
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep({ producesDocumentIds: [] })])],
    documents: [document],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('does not list it')));
});

test('rejects a prerequisite referencing an unknown dependsOnStepId', () => {
  const prerequisite: Prerequisite = {
    stepId: 'step_a',
    dependsOnStepId: 'step_ghost',
    type: 'SEQUENCE',
    reason: 'Ghost dependency for testing.',
    sourceUrl: 'https://example.test/a',
  };
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep()])],
    documents: [],
    prerequisites: [prerequisite],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('unknown dependsOnStepId "step_ghost"')));
});

test('rejects a prerequisite cycle (Invariant P1)', () => {
  const stepA = makeValidStep({ stepId: 'step_a' });
  const stepB = makeValidStep({ stepId: 'step_b' });
  const prerequisites: Prerequisite[] = [
    {
      stepId: 'step_a',
      dependsOnStepId: 'step_b',
      type: 'SEQUENCE',
      reason: 'A needs B.',
      sourceUrl: 'https://example.test/a',
    },
    {
      stepId: 'step_b',
      dependsOnStepId: 'step_a',
      type: 'SEQUENCE',
      reason: 'B needs A.',
      sourceUrl: 'https://example.test/b',
    },
  ];
  const issues = validateDataset({
    procedures: [makeValidProcedure([stepA, stepB])],
    documents: [],
    prerequisites,
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('cycle')));
});

test('rejects a step whose procedureId does not match its owning procedure', () => {
  const issues = validateDataset({
    procedures: [makeValidProcedure([makeValidStep({ procedureId: 'proc_other' })])],
    documents: [],
    prerequisites: [],
    applicabilityRules: [],
  });
  assert.ok(issues.some((i) => i.includes('is listed under procedure') || i.includes('but is')));
});

test('assertValidDataset throws a DataValidationError carrying every issue, never repairs', () => {
  assert.throws(
    () =>
      assertValidDataset({
        procedures: [makeValidProcedure([makeValidStep({ sourceUrl: '', verifiedOn: '' })])],
        documents: [],
        prerequisites: [],
        applicabilityRules: [],
      }),
    (err: unknown) => err instanceof DataValidationError && err.issues.length === 2,
  );
});
