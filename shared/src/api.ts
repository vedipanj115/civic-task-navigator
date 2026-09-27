import type {
  Activity,
  ApiErrorCode,
  City,
  Document,
  EntityType,
  Journey,
  JourneyAnswers,
  PremisesType,
  Prerequisite,
  Procedure,
  Roadmap,
  SourceHealth,
  Step,
  StepStatus,
} from './domain.js';

/** Lists return `{ items, meta }` (04 §5). */
export interface ListResponse<TItem, TMeta extends { count: number } = { count: number }> {
  items: TItem[];
  meta: TMeta;
}

// 1. GET /v1/health
export interface HealthResponse {
  status: 'ok';
  dataVersion: string;
  procedureCount: number;
}

// 2. GET /v1/meta/cities
/** A JourneyAnswers field a city asks for (every field except `city`). */
export type AnswerField = Exclude<keyof JourneyAnswers, 'city'>;

export interface CityMeta {
  city: City;
  label: string;
  requiredAnswers: AnswerField[];
  optionalAnswers: AnswerField[];
}

export interface EnumLabels {
  entityType: Record<EntityType, string>;
  activity: Record<Activity, string>;
  premisesType: Record<PremisesType, string>;
  stepStatus: Record<StepStatus, string>;
  sourceHealth: Record<SourceHealth, string>;
}

export interface MetaCitiesResponse {
  cities: CityMeta[];
  enumLabels: EnumLabels;
}

// 3. GET /v1/procedures
export interface ProcedureListQuery {
  city?: City;
}

export type ProcedureListItem = Pick<Procedure, 'procedureId' | 'name' | 'city' | 'summary'> & {
  stepCount: number;
};

export type ProcedureListResponse = ListResponse<ProcedureListItem>;

// 4. GET /v1/procedures/{procedureId}
export interface ProcedureDetailParams {
  procedureId: string;
}

export type ProcedureDetailResponse = Procedure;

// 5. POST /v1/resolve
export interface ResolveRequest {
  query: string;
  city?: City;
}

export type ResolveCandidate = Pick<Procedure, 'procedureId' | 'name'> & {
  score: number;
};

export type ResolveResponse =
  | { resolved: true; procedureId: string; confidence: number; candidates: ResolveCandidate[] }
  | { resolved: false; procedureId: null; confidence: number; candidates: ResolveCandidate[] };

// 6. POST /v1/roadmap
// journeyId added to resolve 02 §9 vs 04 §3.6; see contract issue.
export type RoadmapRequest = Pick<Journey, 'journeyId' | 'procedureId' | 'answers' | 'completedStepIds'>;

export type RoadmapResponse = Roadmap;

// 7. GET /v1/steps/{stepId}
export interface StepDetailParams {
  stepId: string;
}

export interface StepDetailResponse {
  step: Step;
  documents: Document[];
  prerequisites: Array<Omit<Prerequisite, 'stepId'>>;
  sourceHealth: SourceHealth;
}

// 8. GET /v1/admin/sources
export type AdminSourceItem = Pick<Step, 'stepId' | 'title' | 'department' | 'sourceUrl' | 'verifiedOn'> & {
  sourceHealth: SourceHealth;
  ageDays: number;
};

export type AdminSourcesResponse = ListResponse<AdminSourceItem, { count: number; stale: number; ageing: number }>;

// 9. POST /v1/admin/steps/{stepId}/verify (P1)
export interface VerifyStepParams {
  stepId: string;
}

/** The body is optional. */
export interface VerifyStepRequest {
  note?: string;
}

export type VerifyStepResponse = Step;

// Error envelope (04 §4)
export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  field: string | null;
  details: Record<string, unknown> | null;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
