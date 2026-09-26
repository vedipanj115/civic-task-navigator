# 08 — Team Roles

## 1. Roster

| Slot | Person | GitHub | Role |
|---|---|---|---|
| M1 | Vivaan | @vivaannk07 | Frontend / Product |
| M2 | _claim in issue #1_ | | Backend / Engine |
| M3 | _claim in issue #1_ | | Data / Curation |
| M4 | Vedika | @vedipanj115 | Integration / QA / Specs |

**Vivaan is team leader**: scope decisions, faculty communication, unblocking people.
**Vedika owns the repository and M4**: specs, PR review, keeping `main` green.

Where scope and spec disagree: a **scope change** goes through Vivaan; a **contract change** goes through M4 via a `contract` issue. Both should be rare after Phase 1.

## 2. File ownership

| Path | Owner | Others may |
|---|---|---|
| `web/**` | M1 | read, propose via PR |
| `shared/src/labels.ts` | M1 | read |
| `api/**` | M2 | read |
| `shared/src/domain.ts`, `shared/src/api.ts` | M2 | read; changes need a `contract` issue |
| `data/**` | M3 | read |
| `docs/**`, `scripts/**`, `.github/**`, root config | M4 | propose via PR |

**Nobody edits another owner's files.** If you need a change there, say so in the group or open an issue. This one rule prevented every merge conflict on the team's previous project.

## 3. Phase plan

Phases, not clock times, so this survives whatever duration the event turns out to be. Do not start a phase before the previous one's checkpoint passes.

### Phase 1 — Foundation (target: first quarter of available time)

| Slot | Tasks |
|---|---|
| M1 | Vite + Tailwind v4 shell; `tokens.css` from `07 § 1-2`; the 10 components from `07 § 3`; `/dev` page |
| M2 | `shared/src/domain.ts` and `api.ts` from `02` and `04`; Express skeleton; `/v1/health`; data loader with validation |
| M3 | Curate **procedure 1 completely**: 6 steps, prerequisites, documents, applicability rules, every `sourceUrl` and `verifiedOn` |
| M4 | Repo settings, CI, these docs, `.env.example`, PR template, issue #1 |

**CP1 — done when:** `npm run dev:api` serves `/v1/health`, `npm run dev:web` renders the shell, `/dev` shows all components, and `data/procedures/proc_food_outlet_mumbai.json` loads without validation errors.

### Phase 2 — Engine and graph

| Slot | Tasks |
|---|---|
| M1 | Typed API client; S1 task entry; S2 graph with React Flow; stage columns; blocked styling |
| M2 | Dependency engine per `03`: applicability, pruning, cycle detection, stages, status, totals; `POST /v1/roadmap`; `GET /v1/procedures` |
| M3 | `data/expected-roadmaps.json` oracle for 3 journeys; documents.json; synonyms for task matching |
| M4 | Engine tests against the oracle; smoke script; review PRs |

**CP2 — done when:** typing the demo sentence produces the correct 3-stage graph from the real API, and the engine matches the oracle exactly.

### Phase 3 — Detail and progress

| Slot | Tasks |
|---|---|
| M1 | S3 step panel; source links; mark-as-done; unlock animation; excluded-steps section; accessible list; S4 admin table |
| M2 | `POST /v1/resolve` with thresholds and fallbacks; `GET /v1/steps/{id}`; `GET /v1/admin/sources`; error envelope everywhere |
| M3 | Second procedure if P0 is solid; verify every source link opens; fill gaps found during testing |
| M4 | End-to-end testing of the demo path; edge cases; responsive check; README |

**CP3 — done when:** the full demo path runs start to finish without a console error, and completing the Gumasta unblocks exactly two steps.

### Phase 4 — Polish and submission

Everyone: freeze features. M1 polishes and checks mobile. M2 fixes only bugs. M3 re-verifies dates. M4 records the demo, finishes the README and architecture diagram, and tags the submission.

**CP4 — done when:** the recorded demo exists, the README explains how to run it, and `main` is green.

## 4. Working agreements

1. Commit at least twice per phase. A thin commit history looks like one person did everything.
2. Push your branch before any long break. A laptop failure should cost minutes, not hours.
3. If you are blocked for more than 20 minutes, say so in the group. Silent blocking is the most expensive thing on a small team.
4. Append to `docs/LEARNING-LOG.md` as you go, not at the end. Learning is usually a judged category, and nobody remembers on the last day.
5. No feature that is not in `01-PRD.md § 4`. If you want one, it goes through Vivaan first.
