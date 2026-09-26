# Civic Task Navigator — Frontend (M1)

## Project
PSWB02 for TSEC's internal hackathon. Judging is Monday — prioritize a working demo over completeness.

## My role
I own frontend only (M1). Never touch backend/ or data/ (they don't exist yet — that's fine, expected).

## Data contract
Defined in ../docs/CONTRACT.md. ApplicabilityRule exists in the contract but isn't used by RoadmapResponse, so the frontend can ignore it for now. There's no API endpoint defined yet either — that's expected, build against mock data only until the real backend exists.

## Tech stack
Vite + React 19 + TypeScript, Tailwind, React Flow v11, TanStack Query (not wired to a real API yet).

## Conventions
Functional components, TypeScript strict mode, small components, Tailwind utility classes only.
