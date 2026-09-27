import type { Roadmap } from './types'

// What's left, from the server's statuses: longest chain of unfinished steps (by processingDays.max,
// following blockedBy, which only lists unfinished prerequisites) and the fees not yet paid.
export function remaining(roadmap: Roadmap) {
  const byId = new Map(roadmap.steps.map((rs) => [rs.step.stepId, rs]))
  const finish = new Map<string, number>()
  const finishDay = (id: string): number => {
    const cached = finish.get(id)
    if (cached !== undefined) return cached
    const rs = byId.get(id)
    const days =
      !rs || rs.status === 'COMPLETED'
        ? 0
        : rs.step.processingDays.max + Math.max(0, ...rs.blockedBy.map((b) => finishDay(b.stepId)))
    finish.set(id, days)
    return days
  }
  return {
    days: Math.max(0, ...roadmap.steps.map((rs) => finishDay(rs.step.stepId))),
    cost: roadmap.steps.filter((rs) => rs.status !== 'COMPLETED').reduce((sum, rs) => sum + rs.step.feeInr, 0),
  }
}
