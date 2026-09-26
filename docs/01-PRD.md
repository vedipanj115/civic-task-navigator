# 01 — Product Requirements

## 1. The problem

Completing a routine government procedure in India means assembling information scattered across dozens of disconnected official websites. A citizen opening a small food outlet must work out which registrations apply to them, what documents each needs, which office issues it, what it costs, and — the part nobody publishes — **which steps must be completed before others can even be started**.

None of this is secret. Every fact is on an official page. What is missing is the coordination layer: applicability and ordering. People discover ordering constraints the hard way, at a counter, after a wasted trip, or they pay an agent largely for sequencing knowledge.

## 2. Who has this problem

| User | Situation | What they need |
|---|---|---|
| **First-time small business owner** (primary) | Opening a shop or food outlet, no prior experience, no agent | The full ordered list, what blocks what, what it costs |
| **Student or family member** | Helping a parent or relative register something | A plan they can follow and verify |
| **Admin / maintainer** (secondary) | Keeps the procedure data correct | A view to validate, edit and re-verify entries |

Not in scope: lawyers, chartered accountants and agents. They already know the sequence; the product's value is for people who do not.

## 3. What we are building

A web app where a citizen types one sentence, answers three or four qualifying questions, and receives an **interactive, dependency-aware roadmap**: stages, parallel tracks, blocked steps, documents, fees, offices, official links and progress tracking.

### The one workflow that must work end to end

```
PLAIN-LANGUAGE TASK → RESOLVED PROCEDURE → APPLICABILITY FILTER
  → DEPENDENCY GRAPH → ORDERED ROADMAP → TRACKED COMPLETION
```

Nothing secondary is built until this works completely.

## 4. Scope

### P0 — must exist for the demo

1. Task entry: one sentence + city + qualifying answers
2. Procedure resolution with a visible picker fallback
3. Applicability filtering, with **exclusion reasons shown**
4. Dependency engine: stages, parallel tracks, blocked state, critical path
5. Roadmap graph with stage grouping and labelled blocking edges
6. Step detail: documents, office, fee, processing time, apply link, `sourceUrl`, `verifiedOn`
7. Progress tracking that recomputes what is unblocked
8. Admin review list with stale-source flags

### P1 — only if P0 is solid and time remains

9. Second procedure bundle (e.g. retail shop without food)
10. Print / export the roadmap as a checklist
11. Change-detection worker that flags edited official pages

### Explicitly not building

Live scraping as the demo's data source · nationwide coverage · submitting applications · payment collection · document upload or OCR · user accounts · a legal-advice chatbot · anything implying official endorsement.

## 5. The demo moment

Four government tabs open, none referencing the others. Switch to the product, type one sentence, and a 6-step, 3-stage roadmap assembles in seconds with fees, timings and sources. Then tick off the Gumasta: two greyed-out steps light up and the estimate drops. **That second beat is what proves it is a dependency engine, not a checklist.**

## 6. Success metrics (demonstrable, not claimed)

- Official pages consolidated into one roadmap (target: ≥12 pages, ≥4 departments)
- Steps correctly excluded by applicability, with reasons (target: ≥2)
- Critical path vs strictly sequential completion (target: a visible saving in days)
- Percentage of steps carrying a live `sourceUrl` and `verifiedOn` (target: **100%**)

## 7. Non-negotiables

1. **Every displayed fact is traceable.** No step without a source link and a verification date.
2. **Explain, never assert.** Every blocking edge states its reason.
3. **Scope is one city.** Say so in the UI; do not let a judge assume nationwide coverage.
4. **Guidance, not advice.** A short honest disclaimer, visible but not shouty.
