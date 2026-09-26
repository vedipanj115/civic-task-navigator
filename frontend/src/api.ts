import mock from './mock/roadmap.json'
import type { RoadmapRequest, RoadmapResponse, Step } from './types'

const mockRoadmap = mock as RoadmapResponse

const gstStep: Step = {
  id: 'gst',
  title: 'GST registration',
  documents: ['PAN card', 'Aadhaar card', 'Registered rent agreement', 'Passport-size photo'],
  office: 'GST portal — online',
  fee: 'Free',
  processingTime: 'Up to 7 working days',
  applyLink: 'https://reg.gst.gov.in/registration/',
  sourceUrl: 'https://www.gst.gov.in',
  verifiedOn: '2026-09-20',
  dependsOn: ['pan', 'rent'],
  dependencyReason: { pan: 'GSTIN is PAN-based', rent: 'Place of business proof' },
}

// ponytail: fakes backend applicability for the demo; only turnover is honoured. Delete once the real endpoint exists.
export async function fetchRoadmap(request: RoadmapRequest): Promise<RoadmapResponse> {
  // Must match the option label in TaskEntry's QUESTIONS.
  if (request.answers.turnover !== '₹20 lakh or more') return mockRoadmap
  return {
    ...mockRoadmap,
    stages: mockRoadmap.stages.map((s) =>
      s.stage === 2 ? { ...s, steps: [...s.steps, gstStep] } : s,
    ),
    excludedSteps: mockRoadmap.excludedSteps.filter((s) => s.stepId !== 'gst'),
  }
}
