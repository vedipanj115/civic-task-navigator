export type City = 'MUMBAI';

export type EntityType = 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'LLP';

export type Activity = 'FOOD_SERVICE' | 'RETAIL' | 'SERVICES' | 'MANUFACTURING';

export type PremisesType = 'RENTED' | 'OWNED';

/** Why one step must come before another. */
export type PrerequisiteType = 'DOCUMENT' | 'SEQUENCE';

/** Who issues the document a step needs. */
export type DocumentSource = 'CITIZEN_HELD' | 'ISSUED_BY_STEP';

export type StepStatus = 'AVAILABLE' | 'BLOCKED' | 'COMPLETED' | 'NOT_APPLICABLE';

export type RuleOperator = 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE' | 'IN';

/**
 * Derived, never stored: `FRESH` ≤ 30 days since `verifiedOn`, `AGEING` ≤ 90, else `STALE`.
 */
export type SourceHealth = 'FRESH' | 'AGEING' | 'STALE';

export interface Procedure {
  procedureId: string;        // "proc_food_outlet_mumbai"
  name: string;               // "Open a small food outlet"
  synonyms: string[];         // ["restaurant", "cafe", "eatery", "food stall"]
  city: City;
  appliesTo: {
    entityTypes: EntityType[];
    activities: Activity[];
  };
  summary: string;            // one sentence shown under the title
  steps: Step[];
}

/**
 * Invariant S1: `sourceUrl` and `verifiedOn` are mandatory. A step without both is a data bug
 * and must fail validation at load.
 */
export interface Step {
  stepId: string;             // "step_gumasta"
  procedureId: string;
  title: string;              // "Shop & Establishment registration (Gumasta)"
  shortTitle: string;         // "Gumasta" — used in the graph node
  description: string;        // 1–3 sentences, plain language
  issuingOffice: string;      // "MCGM Shop & Establishment Dept"
  department: string;         // "Municipal Corporation of Greater Mumbai"
  feeInr: number;             // 0 if free
  feeNote?: string;           // "varies by employee count"
  processingDays: { min: number; max: number };
  modeOnline: boolean;        // can it be done entirely online
  applicationUrl?: string;    // where the citizen actually applies
  sourceUrl: string;          // REQUIRED — the official page this data came from
  verifiedOn: string;         // REQUIRED — ISO date "2026-09-26"
  producesDocumentIds: string[];  // documents this step issues
  requiresDocumentIds: string[];  // documents needed to start it
  notes?: string;
}

/**
 * Invariant P1: the prerequisite graph is a DAG. A cycle is a data bug: fail loudly at load,
 * never silently reorder.
 * Invariant P2: every `reason` is a complete sentence a citizen can read.
 */
export interface Prerequisite {
  stepId: string;             // the blocked step
  dependsOnStepId: string;    // the blocking step
  type: PrerequisiteType;
  reason: string;             // "FSSAI application requires the Gumasta certificate"
  sourceUrl: string;          // the page that states this requirement
}

export interface Document {
  documentId: string;         // "doc_gumasta_certificate"
  name: string;               // "Shop & Establishment certificate"
  source: DocumentSource;
  issuedByStepId?: string;    // set when source === 'ISSUED_BY_STEP'
}

/**
 * Invariant A1: rules on the same step are ANDed. A step is included only if every rule passes.
 * Invariant A2: `exclusionReason` is mandatory. "Not applicable" alone is never acceptable.
 */
export interface ApplicabilityRule {
  stepId: string;
  field: 'entityType' | 'activity' | 'annualTurnoverInr' | 'premisesType' | 'seatingCapacity' | 'employeeCount';
  operator: RuleOperator;
  value: string | number | string[];
  exclusionReason: string;    // shown to the citizen when the step is excluded
}

export interface JourneyAnswers {
  city: City;
  entityType: EntityType;
  activity: Activity;
  annualTurnoverInr: number;
  premisesType: PremisesType;
  seatingCapacity?: number;
  employeeCount?: number;
}

/**
 * Journeys live in browser storage under key `cn.journey`. No server persistence in P0.
 */
export interface Journey {
  journeyId: string;          // "jny_" + nanoid, created client-side
  procedureId: string;
  answers: JourneyAnswers;
  createdAt: string;          // ISO datetime
  completedStepIds: string[];
}

/**
 * Invariant R2: every `RoadmapStep.status` of `BLOCKED` has at least one entry in `blockedBy`.
 */
export interface RoadmapStep {
  step: Step;
  status: StepStatus;
  stage: number;              // 1-based; all steps in a stage can run in parallel
  blockedBy: Array<{ stepId: string; shortTitle: string; reason: string }>;
  unlocks: string[];          // stepIds this step unblocks
  missingDocumentIds: string[];
  sourceHealth: SourceHealth;
}

export interface ExcludedStep {
  stepId: string;
  title: string;
  reason: string;             // from the failing ApplicabilityRule
}

/**
 * Invariant R1: `totals.sequentialDaysMax ≥ criticalPathDaysMax`. If they are equal, nothing is
 * parallel, which is worth checking.
 */
export interface Roadmap {
  journeyId: string;
  procedure: { procedureId: string; name: string; city: City; summary: string };
  stages: Array<{ stage: number; stepIds: string[] }>;
  steps: RoadmapStep[];
  excluded: ExcludedStep[];
  totals: {
    applicableStepCount: number;
    excludedStepCount: number;
    totalFeeInr: number;
    criticalPathDaysMin: number;
    criticalPathDaysMax: number;
    sequentialDaysMax: number;      // for the "days saved" comparison
    distinctDepartments: number;
    distinctSourceUrls: number;
  };
}

export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'PROCEDURE_NOT_FOUND'
  | 'STEP_NOT_FOUND'
  | 'TASK_NOT_RECOGNISED'
  | 'AMBIGUOUS_TASK'
  | 'DATA_INTEGRITY_ERROR'    // cycle, missing source, orphan document
  | 'ROUTE_NOT_FOUND'
  | 'INTERNAL_ERROR';
