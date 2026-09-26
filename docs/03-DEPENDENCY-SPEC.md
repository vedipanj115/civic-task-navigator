# 03 — Dependency Spec  **(FROZEN)**

How a roadmap is computed. Deterministic, no ML, fully testable. The API and any mock **must** produce identical output for the same input. `data/expected-roadmaps.json` is the test oracle.

## 1. Pipeline

```
answers + procedureId
   → 1. load procedure and its steps
   → 2. applicability filter          (drop steps, record reasons)
   → 3. prune prerequisite edges      (drop edges to excluded steps)
   → 4. validate DAG                  (cycle → DATA_INTEGRITY_ERROR)
   → 5. topological sort into stages
   → 6. apply completed steps         (status + unblocking)
   → 7. compute totals                (fees, critical path, counts)
   → Roadmap
```

## 2. Step 2 — applicability

For each step, evaluate every `ApplicabilityRule` for that step against `JourneyAnswers`.

- A step is **included** only if all its rules pass (AND).
- A step with no rules is always included.
- The first failing rule supplies the `exclusionReason` shown to the citizen.
- Operators: `EQ`, `NEQ`, `LT`, `LTE`, `GT`, `GTE`, `IN` (value is an array).
- A rule referencing an answer field that is `undefined` **fails** — we never guess on the citizen's behalf.

Example: FSSAI state licence has `{ field: 'annualTurnoverInr', operator: 'GT', value: 1200000, exclusionReason: 'Your turnover is below ₹12 lakh, so basic FSSAI registration applies instead of a state licence.' }`

## 3. Step 3 — edge pruning

If step B depends on step A and **A was excluded**, the edge is dropped, not inherited. Rationale: if a citizen never needs the Gumasta, nothing can be blocked by the Gumasta. Excluded steps never appear in `blockedBy`.

## 4. Step 4 — DAG validation

Run cycle detection (DFS with a recursion stack) on the pruned graph. On a cycle, return `DATA_INTEGRITY_ERROR` naming the stepIds in the cycle. **Never** partially order and carry on.

Also validate at load time, once per process: every step has `sourceUrl` and `verifiedOn`; every `requiresDocumentIds` entry exists; every `ISSUED_BY_STEP` document has a producing step.

## 5. Step 5 — stage assignment

Kahn's algorithm, by layers:

```
stage(s) = 1                              if s has no prerequisites
stage(s) = 1 + max(stage(p) for p in prerequisites(s))   otherwise
```

All steps in the same stage have no path between them, so they can be done on the same day. Within a stage, sort by: `processingDays.max` descending (start the slowest first), then `feeInr` ascending, then `stepId` ascending. Sorting must be total and deterministic — no reliance on object key order.

## 6. Step 6 — status

```
COMPLETED  if stepId ∈ journey.completedStepIds
BLOCKED    if any prerequisite step is not COMPLETED
AVAILABLE  otherwise
```

`blockedBy` lists only prerequisites that are **not yet completed**, each with its `reason`. `unlocks` lists steps that would move from `BLOCKED` to `AVAILABLE` if this step were completed now.

Completing a step never changes stage numbers. Stages describe the plan; status describes progress.

## 7. Step 7 — totals

- `totalFeeInr` — sum of `feeInr` over applicable steps (completed included; the citizen still paid).
- `criticalPathDaysMin/Max` — longest path through the DAG by `processingDays.min` / `.max`. Steps in the same stage count once, not added together.
- `sequentialDaysMax` — plain sum of `processingDays.max` over applicable steps. This is the "if you did it one at a time" comparison used in the demo.
- `distinctDepartments` — unique `department` values.
- `distinctSourceUrls` — unique `sourceUrl` values. This is the "pages consolidated" number.

## 8. Worked example (the demo journey)

Procedure `proc_food_outlet_mumbai`, answers: proprietorship, food service, turnover ₹18,00,000, rented premises, 20 seats, 3 employees.

| Step | Depends on | Stage | Processing (max) |
|---|---|---|---|
| PAN card | — | 1 | 15 |
| Rent agreement + NOC | — | 1 | 3 |
| Gumasta | PAN, rent agreement | 2 | 7 |
| Udyam (MSME) | PAN | 2 | 1 |
| FSSAI registration | Gumasta | 3 | 14 |
| Current bank account | Gumasta, Udyam, PAN | 3 | 3 |

- Stages: `[1: PAN, rent] [2: Gumasta, Udyam] [3: FSSAI, bank]`
- Critical path (max): PAN 15 → Gumasta 7 → FSSAI 14 = **36 days**
- Sequential (max): 15+3+7+1+14+3 = **43 days**
- Excluded with reasons: GST registration (turnover below ₹20 lakh), company incorporation (not a company)

After completing Gumasta: FSSAI and bank move `BLOCKED → AVAILABLE`, and `unlocks` on Gumasta lists both. **This transition is the demo's second beat and must be exact.**

## 9. Task resolution (plain language → procedure)

1. Normalise: lowercase, strip punctuation and filler ("i want to", "how do i", "please").
2. Exact match against `Procedure.name` and each entry of `synonyms`.
3. Token overlap scoring against name + synonyms; score = matched tokens / query tokens.
4. `score ≥ 0.6` and a clear winner → resolve directly.
5. Two candidates within 0.15 of each other → `AMBIGUOUS_TASK`, return both for a picker.
6. No candidate ≥ 0.3 → `TASK_NOT_RECOGNISED`, return all procedures for the picker.

**Never silently pick a low-confidence match.** A wrong roadmap shown confidently is worse than a picker. Embedding-based matching is a P1 upgrade and must keep the same thresholds and fallbacks.

## 10. Test oracle

`data/expected-roadmaps.json` holds the full expected `Roadmap` for at least three journeys: the demo journey above, the same journey with Gumasta completed, and a high-turnover variant where GST is included rather than excluded. Backend tests assert deep equality. **If the engine disagrees with the oracle, fix the engine, not the oracle** — unless the oracle is provably wrong, in which case it changes through a `contract` issue.
