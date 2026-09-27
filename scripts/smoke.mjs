import { readFileSync } from 'node:fs';

const API = process.env.API_URL ?? 'http://localhost:3001';
const cases = JSON.parse(readFileSync('data/expected-roadmaps.json', 'utf8'));
const sorted = (a) => [...(a ?? [])].sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let totalFailures = 0;

for (const { journey, expectedRoadmap: exp } of cases) {
  let failures = 0;
  const check = (label, actual, expected) => {
    if (same(actual, expected)) return;
    failures++;
    console.log(`  FAIL ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
  };

  console.log(`\n${journey.journeyId}`);
  const res = await fetch(`${API}/v1/roadmap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      journeyId: journey.journeyId,
      procedureId: journey.procedureId,
      answers: journey.answers,
      completedStepIds: journey.completedStepIds,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    totalFailures++;
    console.log(`  FAIL HTTP ${res.status}: ${JSON.stringify(body)}`);
    continue;
  }
  const act = body.roadmap ?? body;

  check('stages',
    act.stages.map((s) => ({ stage: s.stage, stepIds: sorted(s.stepIds) })),
    exp.stages.map((s) => ({ stage: s.stage, stepIds: sorted(s.stepIds) })));

  const byId = new Map(act.steps.map((s) => [s.step?.stepId ?? s.stepId, s]));
  check('step ids', sorted([...byId.keys()]), sorted(exp.steps.map((s) => s.stepId)));

  for (const e of exp.steps) {
    const a = byId.get(e.stepId);
    if (!a) continue;
    check(`${e.stepId}.status`, a.status, e.status);
    check(`${e.stepId}.stage`, a.stage, e.stage);
    check(`${e.stepId}.blockedBy`,
      sorted(a.blockedBy.map((b) => `${b.stepId} | ${b.reason}`)),
      sorted(e.blockedBy.map((b) => `${b.stepId} | ${b.reason}`)));
    check(`${e.stepId}.unlocks`, sorted(a.unlocks), sorted(e.unlocks));
    check(`${e.stepId}.missingDocumentIds`, sorted(a.missingDocumentIds), sorted(e.missingDocumentIds));
    check(`${e.stepId}.sourceHealth`, a.sourceHealth, e.sourceHealth);
  }

  check('excluded',
    sorted(act.excluded.map((x) => `${x.stepId} | ${x.reason}`)),
    sorted(exp.excluded.map((x) => `${x.stepId} | ${x.reason}`)));

  for (const [k, v] of Object.entries(exp.totals)) check(`totals.${k}`, act.totals?.[k], v);

  console.log(failures === 0 ? '  ok' : `  ${failures} failure(s)`);
  totalFailures += failures;
}

console.log(totalFailures === 0 ? '\nALL JOURNEYS MATCH' : `\n${totalFailures} FAILURE(S)`);
process.exit(totalFailures === 0 ? 0 : 1);