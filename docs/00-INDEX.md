# Civic Task Navigator — Specification Index

**PSWB02 — Municipal Bureaucracy Path Visualizer · Internal Hackathon 2026-27**

One sentence in, a dependency-aware roadmap out, every step linked to its official source.

---

## Read this first

| If you are… | Start at |
|---|---|
| Any team member | this file, then `01-PRD.md` |
| Looking for your tasks | `08-TEAM-ROLES.md` |
| About to write code | `04-API-CONTRACT.md` — it is frozen |
| About to merge | `09-INTEGRATION-PLAN.md` |
| Curating procedure data | `02-DOMAIN-MODEL.md` + `03-DEPENDENCY-SPEC.md` |

## The documents

| Doc | What it decides | Status |
|---|---|---|
| `01-PRD.md` | Problem, users, scope, what we are not building | Living |
| `02-DOMAIN-MODEL.md` | Entities, fields, enums, invariants | **FROZEN** |
| `03-DEPENDENCY-SPEC.md` | How the roadmap is computed, exactly | **FROZEN** |
| `04-API-CONTRACT.md` | Every route, request, response and error | **FROZEN** |
| `05-ARCHITECTURE.md` | Stack, repo layout, environments, data flow | Living |
| `06-UI-SPEC.md` | Every screen, state and behaviour | Living |
| `07-DESIGN-SYSTEM.md` | Tokens, components, copy rules | **FROZEN** |
| `08-TEAM-ROLES.md` | Who owns what, hour by hour | Living |
| `09-INTEGRATION-PLAN.md` | Branching, PRs, checkpoints, cutover | Living |
| `10-DEMO-AND-SUBMISSION.md` | Demo script, deliverables, checklist | Living |
| `LEARNING-LOG.md` | What each member learned — append as you go | Append-only |

## What FROZEN means

A frozen document is the single source of truth and is not edited casually. If code and a frozen doc disagree, **the doc wins and the code is wrong**. To change a frozen doc: open a GitHub issue labelled `contract`, tag M4, get agreement, and M4 makes the edit in one commit that also updates every affected file. Never edit a frozen doc inside a feature PR.

## Assumptions to confirm (update this section, then tell the team)

These were chosen so work could start. Correct them and re-read the affected docs.

| # | Assumption | Affects |
|---|---|---|
| A1 | Event is roughly 36 working hours across 2 days | `08`, `09`, `10` |
| A2 | City scope is **Mumbai, Maharashtra** only | `01`, `02`, data |
| A3 | Procedure bundle is **opening a small food outlet** (6 steps) | `01`, `03`, data |
| A4 | No department constraint on stack; we use TypeScript everywhere | `05` |
| A5 | No cloud requirement; local dev is enough, deployment is a bonus | `05`, `09` |
| A6 | No login; a journey lives in browser storage | `01`, `02`, `06` |

## Ground rules

1. **Nobody edits another member's files.** Ownership is in `08-TEAM-ROLES.md § 3`.
2. **`main` is protected.** Branch, PR, one approval, squash merge.
3. **No invented facts.** Every procedure step carries a real `sourceUrl` and a `verifiedOn` date. If you cannot find the source, the step does not ship.
4. **Depth beats breadth.** One procedure that is entirely correct beats four that are approximately right.
5. **Ask rather than assume.** A blocked question in the group costs minutes; a wrong assumption costs hours.
