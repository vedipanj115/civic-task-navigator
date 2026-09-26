import metaFixture from './mock/meta.json'
import roadmapFixture from './mock/roadmap.json'
import { applyProgress } from './mock/server'
import stepsFixture from './mock/steps.json'
import type {
  CitiesMetaResponse,
  City,
  Roadmap,
  RoadmapRequest,
  ResolveResponse,
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

// POST /v1/resolve — the mock matches every query to the one procedure we have.
export async function resolveTask(_query: string, _city: City): Promise<ResolveResponse> {
  const { procedureId, name } = baseRoadmap.procedure
  return { resolved: true, procedureId, confidence: 1, candidates: [{ procedureId, name, score: 1 }] }
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
