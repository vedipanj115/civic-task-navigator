import type { Roadmap, StepStatus } from '../types'

// Stand-in for POST /v1/roadmap: applies docs/03-DEPENDENCY-SPEC.md §6 (status + unblocking) to a fresh
// roadmap. `base` must be the nothing-completed response, so its blockedBy lists every prerequisite.
// Stages and totals don't change with progress (§6), so they pass through. Delete once the API is live.
export function applyProgress(base: Roadmap, completedStepIds: string[]): Roadmap {
  const done = new Set(completedStepIds)
  const prereqs = new Map(base.steps.map((rs) => [rs.step.stepId, rs.blockedBy]))
  const open = (id: string) => prereqs.get(id)!.filter((p) => !done.has(p.stepId))
  const issuer = new Map(base.steps.flatMap((rs) => rs.step.producesDocumentIds.map((d) => [d, rs.step.stepId])))

  return {
    ...base,
    steps: base.steps.map((rs) => {
      const id = rs.step.stepId
      const blockedBy = open(id)
      const status: StepStatus = done.has(id) ? 'COMPLETED' : blockedBy.length ? 'BLOCKED' : 'AVAILABLE'
      return {
        ...rs,
        status,
        blockedBy,
        // Steps that would go BLOCKED -> AVAILABLE if this one were completed now.
        unlocks: base.steps
          .map((o) => o.step.stepId)
          .filter((o) => !done.has(o) && open(o).length === 1 && open(o)[0].stepId === id),
        missingDocumentIds: rs.step.requiresDocumentIds.filter((d) => issuer.has(d) && !done.has(issuer.get(d)!)),
      }
    }),
  }
}
