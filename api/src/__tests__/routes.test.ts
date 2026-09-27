import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';

import type {
  ApiErrorResponse,
  HealthResponse,
  MetaCitiesResponse,
  ProcedureDetailResponse,
  ProcedureListResponse,
  ResolveResponse,
  RoadmapRequest,
  RoadmapResponse,
  StepDetailResponse,
  AdminSourcesResponse,
} from '@cn/shared';

import { createApp } from '../app';
import { loadDataset } from '../data/loader';

const fixtureDir = fileURLToPath(new URL('./fixtures/demo-dataset', import.meta.url));
const dataset = loadDataset({ dataDir: fixtureDir });
const app = createApp(dataset);
const server = app.listen(0);
const { port } = server.address() as AddressInfo;
const base = `http://127.0.0.1:${port}/v1`;

test.after(() => {
  server.close();
});

const validAnswers = {
  city: 'MUMBAI' as const,
  entityType: 'PROPRIETORSHIP' as const,
  activity: 'FOOD_SERVICE' as const,
  annualTurnoverInr: 1800000,
  premisesType: 'RENTED' as const,
  seatingCapacity: 20,
  employeeCount: 3,
};

test('GET /v1/health', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as HealthResponse;
  assert.equal(body.status, 'ok');
  assert.equal(body.procedureCount, 1);
});

test('GET /v1/meta/cities', async () => {
  const res = await fetch(`${base}/meta/cities`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as MetaCitiesResponse;
  assert.equal(body.cities[0]!.city, 'MUMBAI');
  assert.deepEqual(body.cities[0]!.requiredAnswers, ['entityType', 'activity', 'annualTurnoverInr', 'premisesType']);
  assert.equal(body.enumLabels.sourceHealth.STALE, 'Needs re-check');
});

test('GET /v1/procedures and ?city= filter', async () => {
  const res = await fetch(`${base}/procedures`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as ProcedureListResponse;
  assert.equal(body.meta.count, 1);
  assert.equal(body.items[0]!.stepCount, 8);

  const filtered = await fetch(`${base}/procedures?city=MUMBAI`);
  assert.equal((await filtered.json() as ProcedureListResponse).meta.count, 1);

  const empty = await fetch(`${base}/procedures?city=DELHI`);
  assert.equal((await empty.json() as ProcedureListResponse).meta.count, 0);
});

test('GET /v1/procedures/:procedureId — found and 404', async () => {
  const ok = await fetch(`${base}/procedures/proc_food_outlet_demo`);
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as ProcedureDetailResponse;
  assert.equal(body.steps.length, 8);

  const missing = await fetch(`${base}/procedures/proc_does_not_exist`);
  assert.equal(missing.status, 404);
  const err = (await missing.json()) as ApiErrorResponse;
  assert.equal(err.error.code, 'PROCEDURE_NOT_FOUND');
});

test('POST /v1/resolve — resolved, and validation error on empty query', async () => {
  const res = await fetch(`${base}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'I want to open a small restaurant' }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as ResolveResponse;
  assert.equal(body.resolved, true);

  const bad = await fetch(`${base}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '' }),
  });
  assert.equal(bad.status, 400);
  const err = (await bad.json()) as ApiErrorResponse;
  assert.equal(err.error.code, 'VALIDATION_FAILED');
  assert.equal(err.error.field, 'query');
});

test('POST /v1/roadmap — the core route, end to end', async () => {
  const request: RoadmapRequest = {
    journeyId: 'jny_demo',
    procedureId: 'proc_food_outlet_demo',
    answers: validAnswers,
    completedStepIds: [],
  };
  const res = await fetch(`${base}/roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  assert.equal(res.status, 200);
  const roadmap = (await res.json()) as RoadmapResponse;
  assert.equal(roadmap.journeyId, 'jny_demo');
  assert.equal(roadmap.totals.applicableStepCount, 6);
  assert.equal(roadmap.totals.criticalPathDaysMax, 36);
  // sourceHealth is computed here at the API boundary (all fixture steps were
  // verifiedOn 2026-01-01, long enough ago from "now" to read STALE).
  assert.equal(roadmap.steps[0]!.sourceHealth, 'STALE');
});

test('POST /v1/roadmap — 400 for a missing required answer, with the right field', async () => {
  const { annualTurnoverInr: _drop, ...answersMissingTurnover } = validAnswers;
  const res = await fetch(`${base}/roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journeyId: 'jny_demo',
      procedureId: 'proc_food_outlet_demo',
      answers: answersMissingTurnover,
      completedStepIds: [],
    }),
  });
  assert.equal(res.status, 400);
  const err = (await res.json()) as ApiErrorResponse;
  assert.equal(err.error.code, 'VALIDATION_FAILED');
  assert.equal(err.error.field, 'annualTurnoverInr');
});

test('POST /v1/roadmap — 404 PROCEDURE_NOT_FOUND', async () => {
  const res = await fetch(`${base}/roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journeyId: 'jny_demo',
      procedureId: 'proc_does_not_exist',
      answers: validAnswers,
      completedStepIds: [],
    }),
  });
  assert.equal(res.status, 404);
  const err = (await res.json()) as ApiErrorResponse;
  assert.equal(err.error.code, 'PROCEDURE_NOT_FOUND');
});

test('GET /v1/steps/:stepId — found (with documents + prerequisites) and 404', async () => {
  const ok = await fetch(`${base}/steps/step_gumasta`);
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as StepDetailResponse;
  assert.equal(body.step.stepId, 'step_gumasta');
  assert.deepEqual(body.documents.map((d) => d.documentId), ['doc_pan']);
  assert.equal(body.prerequisites.length, 2);
  assert.equal(body.sourceHealth, 'STALE');

  const missing = await fetch(`${base}/steps/step_does_not_exist`);
  assert.equal(missing.status, 404);
  const err = (await missing.json()) as ApiErrorResponse;
  assert.equal(err.error.code, 'STEP_NOT_FOUND');
});

test('GET /v1/admin/sources — sorted stale-first with correct counts', async () => {
  const res = await fetch(`${base}/admin/sources`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as AdminSourcesResponse;
  assert.equal(body.meta.count, 8);
  assert.equal(body.meta.stale, 8); // every fixture step was verifiedOn 2026-01-01
  assert.equal(body.items[0]!.sourceHealth, 'STALE');
});

test('POST /v1/admin/steps/:stepId/verify — 501, dataset is read-only in P0', async () => {
  const res = await fetch(`${base}/admin/steps/step_pan/verify`, { method: 'POST' });
  assert.equal(res.status, 501);
  const err = (await res.json()) as ApiErrorResponse;
  assert.ok(err.error.message.length > 0);
});

test('unknown route → 404 ROUTE_NOT_FOUND', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  const err = (await res.json()) as ApiErrorResponse;
  assert.equal(err.error.code, 'ROUTE_NOT_FOUND');
});
