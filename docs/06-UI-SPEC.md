# 06 — UI Spec

Four screens. If a change alters anything described here, update this file **in the same PR**.

## 1. Screens

| # | Screen | Route | Purpose |
|---|---|---|---|
| S1 | Task entry | `/` | One sentence + city + qualifying answers |
| S2 | Roadmap | `/roadmap` | The dependency graph, the product |
| S3 | Step detail | `/roadmap` (side panel) | Documents, fee, office, source |
| S4 | Admin sources | `/admin` | Verification dates and stale flags |

Plus `/dev`, a scratch page rendering every component in every state. Not part of the demo.

## 2. S1 — Task entry

**Layout:** centred column, max 640px. Product name, one-line explainer, then the input.

1. **Task input** — large, placeholder "e.g. I want to open a small restaurant". Submit on Enter or button.
2. **City select** — Mumbai only in P0, visible so the scope is honest.
3. On submit → `POST /v1/resolve`.
   - Resolved → reveal the questions below the input, do not navigate.
   - Ambiguous or unrecognised → show a picker: "Did you mean…" with the candidates, plus "Show all procedures".
4. **Qualifying questions** — appear after resolution, never before: entity type, activity, annual turnover (with a helper "approximate is fine"), premises type, and for food service, seating capacity and employee count.
5. **Primary action** — "Show me the steps" (the only amber button on this screen) → `POST /v1/roadmap` → navigate to S2.

**States:** idle · resolving (button loading, input disabled) · picker · answering · submitting · error (ErrorState with retry).

**Rules:** never auto-select a low-confidence match; never ask a question the resolved procedure does not need; keep answers in the journey so returning to S1 does not clear them.

## 3. S2 — Roadmap

**Layout:** header strip, graph canvas, collapsible summary rail on the right (bottom sheet on mobile).

**Header strip:** procedure name and city; then totals as chips — applicable steps, total fee, estimated days (critical path), departments, pages consolidated.

**Graph:** stages as columns, left to right, labelled "Stage 1 — start now", "Stage 2 — after stage 1", and so on. Nodes use `StepNode`: short title, status chip, fee, days. Blocked nodes at 60% opacity with a dashed border. Edges carry a short reason; hover shows the full sentence. Critical-path edges are thicker.

**Interactions:** click a node → S3 panel; tick "Mark as done" in the panel → re-POST `/v1/roadmap`, update statuses, and animate newly unlocked nodes once; "Reset progress" clears `completedStepIds` after a confirm.

**Excluded steps:** a collapsed section beneath the graph, "3 steps do not apply to you", each with its exclusion reason. Collapsed by default, but never hidden — it is reassurance and it demonstrates the applicability engine.

**Accessible list:** beneath the graph, the same steps as a stage-ordered list, fully keyboard reachable. This is not a fallback; it ships.

**States:** loading (skeleton graph, 3 stage columns of ghost cards) · loaded · recomputing (subtle, never a full-page spinner) · error · `DATA_INTEGRITY_ERROR` (show the cycle plainly; it is a data bug, not a user error).

## 4. S3 — Step detail (side panel)

Title, status chip, and then:

- **What this is** — the description, 1–3 sentences.
- **You need** — documents, each marked "you already have this" or "issued by [step]" with a link to that step.
- **Blocked by** — each blocking step with its reason sentence and source link. Only shown when blocked.
- **Where** — issuing office and department.
- **Cost and time** — fee in ₹ (or "free") and processing days as a range.
- **Apply** — secondary button to the application URL, `target="_blank" rel="noopener"`.
- **Official source** — `SourceLink` with the verified date. **Always present.**
- **Mark as done** — primary action, disabled while blocked with the tooltip "Complete [step] first".

Panel is dismissible by Escape, backdrop click and a close button; focus returns to the node that opened it.

## 5. S4 — Admin sources

A table: step, department, source URL, verified on, health chip, age in days. Sorted stale first. Header shows "6 sources · 0 stale · 0 ageing". P1 adds a "Re-verify" button per row.

Purpose in the demo: it is the trust argument. Show it for ten seconds after the roadmap.

## 6. Global

**Layout:** top bar with product name and a city indicator; content; footer with the disclaimer from `07 § 6`.

**Loading:** skeletons matching final layout. No centred spinners on data screens.

**Errors:** every failed request shows `ErrorState` with the message and the `ApiErrorCode`. Offline or unreachable API shows a banner, not a blank page.

**Empty:** no procedures for a city → EmptyState explaining the scope is Mumbai in this build.

**Responsive:** ≥1024px graph plus rail; 640–1023px graph plus bottom sheet; <640px stage-ordered list first, graph collapsed behind "View graph". **The list view must be complete on mobile** — do not hide information in a graph nobody can read on a phone.

**Persistence:** the journey (procedureId, answers, completedStepIds) in `localStorage` under `cn.journey`, wrapped in try/catch. If storage fails, the app still works for the session.
