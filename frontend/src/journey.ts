import type { Journey } from './types'

const KEY = 'cn.journey' // docs/02-DOMAIN-MODEL.md §8

// Storage can be missing, blocked or hold stale data from an older build: fall back to no journey.
export function loadJourney(): Journey | null {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return j && typeof j.procedureId === 'string' && j.answers && Array.isArray(j.completedStepIds) ? j : null
  } catch {
    return null
  }
}

export function saveJourney(journey: Journey | null) {
  try {
    if (journey) localStorage.setItem(KEY, JSON.stringify(journey))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable: progress lasts for this session only (docs/06-UI-SPEC.md).
  }
}
