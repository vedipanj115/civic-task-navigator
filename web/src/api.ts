import type {
  AdminSourcesResponse,
  ApiErrorResponse,
  City,
  MetaCitiesResponse,
  ResolveRequest,
  ResolveResponse,
  RoadmapRequest,
  RoadmapResponse,
  StepDetailResponse,
} from './types'

// Calls the docs/04-API-CONTRACT.md routes. Relative /v1 paths: in dev, vite.config.ts proxies them to the API.
// Non-2xx responses throw an Error carrying the envelope's `code` (docs/04 §4), which ErrorState displays.
async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    `/v1${path}`,
    body === undefined
      ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (json as ApiErrorResponse | null)?.error
    throw Object.assign(new Error(error?.message ?? `Request failed (HTTP ${res.status})`), error && { code: error.code })
  }
  return json as T
}

export const fetchMeta = () => request<MetaCitiesResponse>('/meta/cities')

export const resolveTask = (query: string, city: City) =>
  request<ResolveResponse>('/resolve', { query, city } satisfies ResolveRequest)

export const fetchRoadmap = (req: RoadmapRequest) => request<RoadmapResponse>('/roadmap', req)

export const fetchStep = (stepId: string) => request<StepDetailResponse>(`/steps/${encodeURIComponent(stepId)}`)

export const fetchAdminSources = () => request<AdminSourcesResponse>('/admin/sources')
