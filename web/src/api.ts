import metaFixture from './mock/meta.json'
import roadmapFixture from './mock/roadmap.json'
import { applyProgress } from './mock/server'
import stepsFixture from './mock/steps.json'
import type {
  AdminSource,
  CitiesMetaResponse,
  City,
  Roadmap,
  RoadmapRequest,
  ResolveResponse,
  SourceHealth,
  StepDetailResponse,
} from './types'

// ponytail: every function here mocks a docs/04-API-CONTRACT.md route. Swap each body for
// fetch(`${import.meta.env.VITE_API_BASE_URL}/...`) once the API is up; callers won't change.

const baseRoadmap = roadmapFixture as Roadmap
const stepExtras = stepsFixture as Record<string, Pick<StepDetailResponse, 'documents' | 'prerequisites'>>

// GET /v1/meta/cities
export async function fetchMeta(): Promise<CitiesMetaResponse> {
  return metaFixture as CitiesMetaResponse
}

// POST /v1/resolve — the mock resolves any query mentioning a food-outlet keyword; anything else is
// unrecognised (still a 200) and returns every procedure (just ours) as a candidate for the picker.
// ponytail: substring keyword match; the real resolver scores token overlap (docs/03-DEPENDENCY-SPEC.md §9).
const FOOD_OUTLET_KEYWORDS = ['restaurant', 'food', 'shop', 'cafe', 'eatery', 'outlet', 'stall']

export async function resolveTask(query: string, _city: City): Promise<ResolveResponse> {
  const { procedureId, name } = baseRoadmap.procedure
  const q = query.toLowerCase()
  if (FOOD_OUTLET_KEYWORDS.some((k) => q.includes(k)))
    return { resolved: true, procedureId, confidence: 1, candidates: [{ procedureId, name, score: 1 }] }
  return { resolved: false, procedureId: null, confidence: 0, candidates: [{ procedureId, name, score: 0 }] }
}

// POST /v1/roadmap — the mock ignores procedureId/answers; only completedStepIds changes the result.
export async function fetchRoadmap(request: RoadmapRequest): Promise<Roadmap> {
  return applyProgress(baseRoadmap, request.completedStepIds)
}

// GET /v1/steps/{stepId}
export async function fetchStep(stepId: string): Promise<StepDetailResponse> {
  const rs = baseRoadmap.steps.find((s) => s.step.stepId === stepId)
  if (!rs) throw new Error('STEP_NOT_FOUND')
  return { step: rs.step, ...stepExtras[stepId], sourceHealth: rs.sourceHealth }
}

// GET /v1/admin/sources — stale first, then ageing, then fresh; oldest verification first within each.
const HEALTH_ORDER: Record<SourceHealth, number> = { STALE: 0, AGEING: 1, FRESH: 2 }

export async function fetchAdminSources(): Promise<AdminSource[]> {
  return baseRoadmap.steps
    .map(({ step, sourceHealth }) => ({
      stepId: step.stepId,
      title: step.title,
      department: step.department,
      issuingOffice: step.issuingOffice,
      sourceUrl: step.sourceUrl,
      verifiedOn: step.verifiedOn,
      sourceHealth,
    }))
    .sort((a, b) => HEALTH_ORDER[a.sourceHealth] - HEALTH_ORDER[b.sourceHealth] || a.verifiedOn.localeCompare(b.verifiedOn))
}
