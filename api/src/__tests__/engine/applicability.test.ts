import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ApplicabilityRule, JourneyAnswers, Step } from '@cn/shared';

import { evaluateApplicability } from '../../engine/applicability';

function makeStep(stepId: string): Step {
  return {
    stepId,
    procedureId: 'proc_x',
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
  };
}

const answers: JourneyAnswers = {
  city: 'MUMBAI',
  entityType: 'PROPRIETORSHIP',
  activity: 'FOOD_SERVICE',
  annualTurnoverInr: 1800000,
  premisesType: 'RENTED',
  seatingCapacity: 20,
  employeeCount: 3,
};

test('a step with no rules is always included', () => {
  const { applicableSteps, excluded } = evaluateApplicability([makeStep('a')], [], answers);
  assert.equal(applicableSteps.length, 1);
  assert.equal(excluded.length, 0);
});

test('EQ / NEQ operators', () => {
  const eqRule: ApplicabilityRule = {
    stepId: 'a',
    field: 'entityType',
    operator: 'EQ',
    value: 'PROPRIETORSHIP',
    exclusionReason: 'not a proprietorship',
  };
  assert.equal(evaluateApplicability([makeStep('a')], [eqRule], answers).applicableSteps.length, 1);

  const neqRule: ApplicabilityRule = { ...eqRule, operator: 'NEQ', exclusionReason: 'is a proprietorship' };
  assert.equal(evaluateApplicability([makeStep('a')], [neqRule], answers).excluded.length, 1);
});

test('LT / LTE / GT / GTE operators on a numeric field', () => {
  const step = makeStep('gst');
  const gte: ApplicabilityRule = {
    stepId: 'gst',
    field: 'annualTurnoverInr',
    operator: 'GTE',
    value: 2000000,
    exclusionReason: 'Your turnover is below ₹20 lakh, so GST registration is not required.',
  };
  const excludedResult = evaluateApplicability([step], [gte], answers);
  assert.equal(excludedResult.applicableSteps.length, 0);
  assert.equal(excludedResult.excluded[0]!.reason, gte.exclusionReason);

  const lte: ApplicabilityRule = { ...gte, operator: 'LTE', value: 1800000 };
  assert.equal(evaluateApplicability([step], [lte], answers).applicableSteps.length, 1);

  const lt: ApplicabilityRule = { ...gte, operator: 'LT', value: 1800000 };
  assert.equal(evaluateApplicability([step], [lt], answers).applicableSteps.length, 0);

  const gt: ApplicabilityRule = { ...gte, operator: 'GT', value: 1000000 };
  assert.equal(evaluateApplicability([step], [gt], answers).applicableSteps.length, 1);
});

test('IN operator', () => {
  const step = makeStep('incorporation');
  const inRule: ApplicabilityRule = {
    stepId: 'incorporation',
    field: 'entityType',
    operator: 'IN',
    value: ['PRIVATE_LIMITED', 'LLP'],
    exclusionReason: 'Company incorporation only applies to private limited companies and LLPs.',
  };
  assert.equal(evaluateApplicability([step], [inRule], answers).applicableSteps.length, 0);

  const matching: ApplicabilityRule = { ...inRule, value: ['PROPRIETORSHIP', 'LLP'] };
  assert.equal(evaluateApplicability([step], [matching], answers).applicableSteps.length, 1);
});

test('rules on the same step are ANDed — one failing rule excludes the step', () => {
  const step = makeStep('a');
  const passingRule: ApplicabilityRule = {
    stepId: 'a',
    field: 'activity',
    operator: 'EQ',
    value: 'FOOD_SERVICE',
    exclusionReason: 'not food service',
  };
  const failingRule: ApplicabilityRule = {
    stepId: 'a',
    field: 'premisesType',
    operator: 'EQ',
    value: 'OWNED',
    exclusionReason: 'premises must be owned',
  };
  const { applicableSteps, excluded } = evaluateApplicability([step], [passingRule, failingRule], answers);
  assert.equal(applicableSteps.length, 0);
  assert.equal(excluded[0]!.reason, 'premises must be owned');
});

test('the first failing rule (in array order) supplies the exclusionReason', () => {
  const step = makeStep('a');
  const firstFailing: ApplicabilityRule = {
    stepId: 'a',
    field: 'premisesType',
    operator: 'EQ',
    value: 'OWNED',
    exclusionReason: 'first reason',
  };
  const secondFailing: ApplicabilityRule = {
    stepId: 'a',
    field: 'entityType',
    operator: 'EQ',
    value: 'LLP',
    exclusionReason: 'second reason',
  };
  const { excluded } = evaluateApplicability([step], [firstFailing, secondFailing], answers);
  assert.equal(excluded[0]!.reason, 'first reason');
});

test('a rule referencing an undefined answer field fails (never guessed)', () => {
  const step = makeStep('a');
  const rule: ApplicabilityRule = {
    stepId: 'a',
    field: 'seatingCapacity',
    operator: 'GT',
    value: 10,
    exclusionReason: 'seating capacity unknown or too small',
  };
  const answersWithoutSeating: JourneyAnswers = { ...answers, seatingCapacity: undefined };
  const { applicableSteps, excluded } = evaluateApplicability([step], [rule], answersWithoutSeating);
  assert.equal(applicableSteps.length, 0);
  assert.equal(excluded.length, 1);
});
