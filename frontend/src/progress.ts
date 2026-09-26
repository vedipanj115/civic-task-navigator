import type { RoadmapResponse, Step } from './types'

export type Status = 'done' | 'available' | 'blocked'

export function allSteps(roadmap: RoadmapResponse): Step[] {
  return roadmap.stages.flatMap((s) => s.steps)
}

// A step unlocks once every dependency in the roadmap is done; deps not in the roadmap (excluded) don't block.
export function stepStatuses(roadmap: RoadmapResponse, done: Set<string>): Map<string, Status> {
  const steps = allSteps(roadmap)
  const ids = new Set(steps.map((s) => s.id))
  return new Map(
    steps.map((s) => [
      s.id,
      done.has(s.id)
        ? 'done'
        : s.dependsOn.every((d) => done.has(d) || !ids.has(d))
          ? 'available'
          : 'blocked',
    ]),
  )
}

// ponytail: fee and processingTime are free text in the contract, so numbers are parsed out of them.
// Ask backend for numeric feeAmount / maxDays fields if these heuristics misread real data.
export function feeAmount(fee: string): number {
  if (/^free/i.test(fee)) return 0
  const m = fee.match(/\d[\d,]*/)
  return m ? Number(m[0].replaceAll(',', '')) : 0
}

export function maxDays(processingTime: string): number {
  const nums = processingTime.match(/\d+/g)
  return nums ? Math.max(...nums.map(Number)) : 0 // "Same day" -> 0
}

// Longest remaining chain (done steps take 0 days) and total cost minus fees already paid.
export function remaining(roadmap: RoadmapResponse, done: Set<string>) {
  const steps = allSteps(roadmap)
  const finish = new Map<string, number>()
  // Stages come in dependency order, so every dep's finish day is known before its dependents.
  for (const s of steps) {
    const start = Math.max(0, ...s.dependsOn.map((d) => finish.get(d) ?? 0))
    finish.set(s.id, start + (done.has(s.id) ? 0 : maxDays(s.processingTime)))
  }
  const paid = steps.filter((s) => done.has(s.id)).reduce((sum, s) => sum + feeAmount(s.fee), 0)
  return {
    days: Math.max(0, ...finish.values()),
    cost: Math.max(0, roadmap.totalCost - paid),
  }
}
