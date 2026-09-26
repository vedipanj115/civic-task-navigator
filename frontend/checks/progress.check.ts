// Run with: npm run check
import assert from 'node:assert/strict'
import mock from '../src/mock/roadmap.json' with { type: 'json' }
import stepsMock from '../src/mock/steps.json' with { type: 'json' }
import { applyProgress } from '../src/mock/server.ts'
import { remaining } from '../src/progress.ts'
import type { Roadmap, StepDetailResponse } from '../src/types.ts'

const base = mock as Roadmap
const extras = stepsMock as Record<string, Pick<StepDetailResponse, 'documents' | 'prerequisites'>>
const step = (r: Roadmap, id: string) => r.steps.find((s) => s.step.stepId === id)!

// docs/03-DEPENDENCY-SPEC.md §8 numbers.
assert.equal(base.totals.criticalPathDaysMax, 36)
assert.equal(base.totals.sequentialDaysMax, 43)
assert.deepEqual(base.stages.map((s) => s.stepIds), [
  ['step_pan', 'step_rent_agreement'],
  ['step_gumasta', 'step_udyam'],
  ['step_fssai', 'step_bank_account'],
])
assert.deepEqual(base.excluded.map((e) => e.title), ['GST registration', 'Company incorporation'])

// The stub reproduces the fixture exactly for a fresh journey.
assert.deepEqual(applyProgress(base, []), base)

// Step-detail prerequisites (graph edges) agree with the roadmap's fresh blockedBy.
for (const rs of base.steps) {
  assert.deepEqual(
    extras[rs.step.stepId].prerequisites.map((p) => [p.dependsOnStepId, p.reason]),
    rs.blockedBy.map((b) => [b.stepId, b.reason]),
    rs.step.stepId,
  )
}

// The demo's second beat: with PAN, rent and Udyam done, Gumasta unlocks FSSAI + bank...
const before = applyProgress(base, ['step_pan', 'step_rent_agreement', 'step_udyam'])
assert.deepEqual([...step(before, 'step_gumasta').unlocks].sort(), ['step_bank_account', 'step_fssai'])
assert.equal(step(before, 'step_fssai').status, 'BLOCKED')
assert.equal(step(before, 'step_bank_account').status, 'BLOCKED')

// ...and completing Gumasta moves both to AVAILABLE.
const after = applyProgress(base, ['step_pan', 'step_rent_agreement', 'step_udyam', 'step_gumasta'])
assert.equal(step(after, 'step_fssai').status, 'AVAILABLE')
assert.equal(step(after, 'step_bank_account').status, 'AVAILABLE')
assert.deepEqual(step(after, 'step_bank_account').blockedBy, [])
assert.deepEqual(step(after, 'step_bank_account').missingDocumentIds, [])

// Remaining: fresh = the fixture totals; after Gumasta only FSSAI's 14 days and its ₹100 are left.
assert.deepEqual(remaining(base), { days: 36, cost: base.totals.totalFeeInr })
assert.deepEqual(remaining(after), { days: 14, cost: 100 })

console.log('progress checks passed')
