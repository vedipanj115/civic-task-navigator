// Run with: npm run check
import assert from 'node:assert/strict'
import mock from '../src/mock/roadmap.json' with { type: 'json' }
import { feeAmount, maxDays, remaining, stepStatuses } from '../src/progress.ts'
import type { RoadmapResponse } from '../src/types.ts'

const roadmap = mock as RoadmapResponse

assert.equal(feeAmount('~₹2,000'), 2000)
assert.equal(feeAmount('₹100 / year'), 100)
assert.equal(feeAmount('Free (under 10 workers)'), 0)
assert.equal(maxDays('15–30 days'), 30)
assert.equal(maxDays('Up to 7 working days'), 7)
assert.equal(maxDays('Same day'), 0)

// Nothing done: fixture totals come back unchanged.
assert.deepEqual(remaining(roadmap, new Set()), { days: roadmap.criticalPathDays, cost: roadmap.totalCost })

let status = stepStatuses(roadmap, new Set(['pan']))
assert.equal(status.get('pan'), 'done')
assert.equal(status.get('udyam'), 'available') // depended only on PAN
assert.equal(status.get('shop'), 'blocked') // still needs rent

status = stepStatuses(roadmap, new Set(['pan', 'rent']))
assert.equal(status.get('shop'), 'available')

// Everything but bank + health done: chain is health's 30 days, cost is health's ~₹2,000.
assert.deepEqual(remaining(roadmap, new Set(['pan', 'rent', 'udyam', 'shop', 'fssai'])), { days: 30, cost: 2000 })

console.log('progress checks passed')
