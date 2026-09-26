// Local copy of the frozen types in docs/02-DOMAIN-MODEL.md and docs/04-API-CONTRACT.md.
// Replace with @cn/shared once it's importable.

export type City = 'MUMBAI'

export type EntityType = 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'LLP'

export type Activity = 'FOOD_SERVICE' | 'RETAIL' | 'SERVICES' | 'MANUFACTURING'

export type PremisesType = 'RENTED' | 'OWNED'

export type StepStatus = 'AVAILABLE' | 'BLOCKED' | 'COMPLETED' | 'NOT_APPLICABLE'

export type SourceHealth = 'FRESH' | 'AGEING' | 'STALE'

export type PrerequisiteType = 'DOCUMENT' | 'SEQUENCE'

export type DocumentSource = 'CITIZEN_HELD' | 'ISSUED_BY_STEP'

// §4
export interface Step {
  stepId: string // "step_gumasta"
  procedureId: string
  title: string // "Shop & Establishment registration (Gumasta)"
  shortTitle: string // "Gumasta" — used in the graph node
  description: string // 1–3 sentences, plain language
  issuingOffice: string // "MCGM Shop & Establishment Dept"
  department: string // "Municipal Corporation of Greater Mumbai"
  feeInr: number // 0 if free
  feeNote?: string // "varies by employee count"
  processingDays: { min: number; max: number }
  modeOnline: boolean // can it be done entirely online
  applicationUrl?: string // where the citizen actually applies
  sourceUrl: string // REQUIRED — the official page this data came from
  verifiedOn: string // REQUIRED — ISO date "2026-09-26"
  producesDocumentIds: string[] // documents this step issues
  requiresDocumentIds: string[] // documents needed to start it
  notes?: string
}

// §6
export interface Document {
  documentId: string // "doc_gumasta_certificate"
  name: string // "Shop & Establishment certificate"
  source: DocumentSource
  issuedByStepId?: string // set when source === 'ISSUED_BY_STEP'
}

// §8
export interface JourneyAnswers {
  city: City
  entityType: EntityType
  activity: Activity
  annualTurnoverInr: number
  premisesType: PremisesType
  seatingCapacity?: number
  employeeCount?: number
}

export interface Journey {
  journeyId: string // "jny_" + nanoid, created client-side
  procedureId: string
  answers: JourneyAnswers
  createdAt: string // ISO datetime
  completedStepIds: string[]
}

// §9
export interface RoadmapStep {
  step: Step
  status: StepStatus
  stage: number // 1-based; all steps in a stage can run in parallel
  blockedBy: Array<{ stepId: string; shortTitle: string; reason: string }>
  unlocks: string[] // stepIds this step unblocks
  missingDocumentIds: string[]
  sourceHealth: SourceHealth
}

export interface ExcludedStep {
  stepId: string
  title: string
  reason: string // from the failing ApplicabilityRule
}

export interface Roadmap {
  journeyId: string
  procedure: { procedureId: string; name: string; city: City; summary: string }
  stages: Array<{ stage: number; stepIds: string[] }>
  steps: RoadmapStep[]
  excluded: ExcludedStep[]
  totals: {
    applicableStepCount: number
    excludedStepCount: number
    totalFeeInr: number
    criticalPathDaysMin: number
    criticalPathDaysMax: number
    sequentialDaysMax: number // for the "days saved" comparison
    distinctDepartments: number
    distinctSourceUrls: number
  }
}

// docs/04-API-CONTRACT.md

// §2 GET /v1/meta/cities
export interface CitiesMetaResponse {
  cities: Array<{ city: City; label: string; requiredAnswers: string[]; optionalAnswers: string[] }>
  enumLabels: {
    entityType: Record<EntityType, string>
    activity: Record<Activity, string>
    premisesType: Record<PremisesType, string>
    stepStatus: Record<StepStatus, string>
    sourceHealth: Record<SourceHealth, string>
  }
}

// §5 POST /v1/resolve
export interface ResolveResponse {
  resolved: boolean
  procedureId: string | null
  confidence: number
  candidates: Array<{ procedureId: string; name: string; score: number }>
}

// §6 POST /v1/roadmap
export interface RoadmapRequest {
  procedureId: string
  answers: JourneyAnswers
  completedStepIds: string[]
}

// §7 GET /v1/steps/{stepId}
export interface StepDetailResponse {
  step: Step
  documents: Document[]
  prerequisites: Array<{ dependsOnStepId: string; type: PrerequisiteType; reason: string; sourceUrl: string }>
  sourceHealth: SourceHealth
}
