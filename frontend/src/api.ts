import mock from './mock/roadmap.json'
import type { RoadmapRequest, RoadmapResponse } from './types'

const mockRoadmap = mock as RoadmapResponse

// ponytail: returns the same fixture for every request; swap for a fetch once backend defines the endpoint.
export async function fetchRoadmap(_request: RoadmapRequest): Promise<RoadmapResponse> {
  return mockRoadmap
}
