// Mirrors ../docs/CONTRACT.md — keep in sync.

export type Step = {
  id: string
  title: string
  documents: string[]
  office: string
  fee: string
  processingTime: string
  applyLink: string
  sourceUrl: string
  verifiedOn: string // ISO date
  dependsOn: string[] // step ids required first
  dependencyReason: Record<string, string> // stepId -> "why" text
}

export type RoadmapResponse = {
  procedureId: string
  stages: { stage: number; steps: Step[] }[]
  excludedSteps: { stepId: string; title: string; reason: string }[]
  criticalPathDays: number
  totalCost: number
}

// Not in the contract yet — agree on this with backend before wiring the API.
export type RoadmapRequest = {
  task: string
  city: string
  answers: Record<string, string>
}
