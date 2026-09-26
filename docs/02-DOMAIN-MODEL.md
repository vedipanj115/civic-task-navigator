# 02 — Domain Model  **(FROZEN)**

Types live in `shared/src/domain.ts`. Web and API both import from `@cn/shared`. **Never redefine these types locally.**

## 1. Entities at a glance

```
Procedure 1─* Step *─* Document        (via StepDocument)
Step      *─* Step     (via Prerequisite: blocks / blocked-by)
Step      1─* ApplicabilityRule
Journey   1─* JourneyProgress ─ Step
```

## 2. Enums

```ts
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

export type SourceHealth = 'FRESH' | 'AGEING' | 'STALE';
```

`SourceHealth` is derived, never stored: `FRESH` ≤ 30 days since `verifiedOn`, `AGEING` ≤ 90, else `STALE`.

## 3. Procedure

A bundle of steps that together accomplish one civic task.

```ts
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
```

## 4. Step

```ts
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
```

**Invariant S1:** `sourceUrl` and `verifiedOn` are mandatory. A step without both is a data bug and must fail validation at load.

## 5. Prerequisite

```ts
export interface Prerequisite {
  stepId: string;             // the blocked step
  dependsOnStepId: string;    // the blocking step
  type: PrerequisiteType;
  reason: string;             // "FSSAI application requires the Gumasta certificate"
  sourceUrl: string;          // the page that states this requirement
}
```

**Invariant P1:** the prerequisite graph is a DAG. A cycle is a data bug: fail loudly at load, never silently reorder.
**Invariant P2:** every `reason` is a complete sentence a citizen can read.

## 6. Document

```ts
export interface Document {
  documentId: string;         // "doc_gumasta_certificate"
  name: string;               // "Shop & Establishment certificate"
  source: DocumentSource;
  issuedByStepId?: string;    // set when source === 'ISSUED_BY_STEP'
}
```

## 7. ApplicabilityRule

Decides whether a step applies to this particular citizen.

```ts
export interface ApplicabilityRule {
  stepId: string;
  field: 'entityType' | 'activity' | 'annualTurnoverInr' | 'premisesType' | 'seatingCapacity' | 'employeeCount';
  operator: RuleOperator;
  value: string | number | string[];
  exclusionReason: string;    // shown to the citizen when the step is excluded
}
```

**Invariant A1:** rules on the same step are ANDed. A step is included only if every rule passes.
**Invariant A2:** `exclusionReason` is mandatory. "Not applicable" alone is never acceptable.

## 8. Journey and progress

```ts
export interface JourneyAnswers {
  city: City;
  entityType: EntityType;
  activity: Activity;
  annualTurnoverInr: number;
  premisesType: PremisesType;
  seatingCapacity?: number;
  employeeCount?: number;
}

export interface Journey {
  journeyId: string;          // "jny_" + nanoid, created client-side
  procedureId: string;
  answers: JourneyAnswers;
  createdAt: string;          // ISO datetime
  completedStepIds: string[];
}
```

Journeys live in browser storage under key `cn.journey`. No server persistence in P0.

## 9. Computed roadmap (server output, never stored)

```ts
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
```

**Invariant R1:** `totals.sequentialDaysMax ≥ criticalPathDaysMax`. If they are equal, nothing is parallel, which is worth checking.
**Invariant R2:** every `RoadmapStep.status` of `BLOCKED` has at least one entry in `blockedBy`.

## 10. Error codes (used by `04-API-CONTRACT.md`)

```ts
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'PROCEDURE_NOT_FOUND'
  | 'STEP_NOT_FOUND'
  | 'TASK_NOT_RECOGNISED'
  | 'AMBIGUOUS_TASK'
  | 'DATA_INTEGRITY_ERROR'    // cycle, missing source, orphan document
  | 'ROUTE_NOT_FOUND'
  | 'INTERNAL_ERROR';
```
