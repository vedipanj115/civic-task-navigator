# 04 — API Contract  **(FROZEN)**

Request and response types live in `shared/src/api.ts`. Both sides import them. **Never redefine.**

## 1. Basics

- Base URL: `http://localhost:3001/v1` in dev, from `VITE_API_BASE_URL` in the web app.
- JSON only. `Content-Type: application/json` on requests with a body.
- No authentication in P0. The admin routes are unprotected and local only; say so in the README.
- All dates are ISO 8601 strings. All money is integer rupees, never floats.
- Unknown routes return `404 ROUTE_NOT_FOUND` in the standard envelope.

## 2. Route table

| # | Method | Path | Purpose | Priority |
|---|---|---|---|---|
| 1 | GET | `/v1/health` | Liveness for the dev banner and smoke test | P0 |
| 2 | GET | `/v1/meta/cities` | Cities and the answer fields each needs | P0 |
| 3 | GET | `/v1/procedures` | List procedures (for the picker) | P0 |
| 4 | GET | `/v1/procedures/{procedureId}` | One procedure with its steps | P0 |
| 5 | POST | `/v1/resolve` | Plain-language task → procedure candidates | P0 |
| 6 | POST | `/v1/roadmap` | Answers + procedureId + completed → `Roadmap` | **P0 core** |
| 7 | GET | `/v1/steps/{stepId}` | One step's full detail | P0 |
| 8 | GET | `/v1/admin/sources` | Every step's source URL, date and health | P0 |
| 9 | POST | `/v1/admin/steps/{stepId}/verify` | Re-stamp `verifiedOn` to today | P1 |

Nine routes. Do not add a tenth without a `contract` issue.

## 3. Route detail

### 1. `GET /v1/health`
```json
{ "status": "ok", "dataVersion": "2026-09-26", "procedureCount": 1 }
```

### 2. `GET /v1/meta/cities`
```json
{
  "cities": [
    { "city": "MUMBAI", "label": "Mumbai, Maharashtra",
      "requiredAnswers": ["entityType", "activity", "annualTurnoverInr", "premisesType"],
      "optionalAnswers": ["seatingCapacity", "employeeCount"] }
  ],
  "enumLabels": {
    "entityType": { "PROPRIETORSHIP": "Sole proprietorship", "PARTNERSHIP": "Partnership",
                    "PRIVATE_LIMITED": "Private limited company", "LLP": "LLP" },
    "activity": { "FOOD_SERVICE": "Food service", "RETAIL": "Retail shop",
                  "SERVICES": "Services", "MANUFACTURING": "Manufacturing" },
    "premisesType": { "RENTED": "Rented", "OWNED": "Owned" },
    "stepStatus": { "AVAILABLE": "Ready to start", "BLOCKED": "Blocked",
                    "COMPLETED": "Done", "NOT_APPLICABLE": "Not applicable" },
    "sourceHealth": { "FRESH": "Verified recently", "AGEING": "Verify soon", "STALE": "Needs re-check" }
  }
}
```
**The web app takes all display strings from `enumLabels`. Never hardcode an enum label in a component.**

### 3. `GET /v1/procedures`
Optional query: `?city=MUMBAI`
```json
{ "items": [ { "procedureId": "proc_food_outlet_mumbai", "name": "Open a small food outlet",
               "city": "MUMBAI", "summary": "…", "stepCount": 6 } ],
  "meta": { "count": 1 } }
```

### 4. `GET /v1/procedures/{procedureId}`
Returns the full `Procedure` including `steps`. `404 PROCEDURE_NOT_FOUND` if unknown.

### 5. `POST /v1/resolve`
Request: `{ "query": "I want to open a small restaurant", "city": "MUMBAI" }`

Resolved:
```json
{ "resolved": true, "procedureId": "proc_food_outlet_mumbai", "confidence": 0.82,
  "candidates": [ { "procedureId": "proc_food_outlet_mumbai", "name": "Open a small food outlet", "score": 0.82 } ] }
```
Ambiguous or unrecognised: `resolved: false`, `procedureId: null`, and `candidates` populated for the picker. This is a **200**, not an error — the UI shows a picker, not a failure. `400 VALIDATION_FAILED` only for a missing or empty `query`.

### 6. `POST /v1/roadmap` — the core route
Request:
```json
{ "procedureId": "proc_food_outlet_mumbai",
  "answers": { "city": "MUMBAI", "entityType": "PROPRIETORSHIP", "activity": "FOOD_SERVICE",
               "annualTurnoverInr": 1800000, "premisesType": "RENTED",
               "seatingCapacity": 20, "employeeCount": 3 },
  "completedStepIds": ["step_gumasta"] }
```
Response: the `Roadmap` object exactly as defined in `02-DOMAIN-MODEL.md § 9`.

Errors: `400 VALIDATION_FAILED` (with `field`) for a missing required answer; `404 PROCEDURE_NOT_FOUND`; `409 DATA_INTEGRITY_ERROR` with `details.cycle` for a prerequisite cycle.

### 7. `GET /v1/steps/{stepId}`
```json
{ "step": { /* full Step */ },
  "documents": [ { "documentId": "doc_pan", "name": "PAN card", "source": "CITIZEN_HELD", "issuedByStepId": null } ],
  "prerequisites": [ { "dependsOnStepId": "step_pan", "type": "DOCUMENT",
                       "reason": "The Gumasta application requires the applicant's PAN.",
                       "sourceUrl": "https://…" } ],
  "sourceHealth": "FRESH" }
```

### 8. `GET /v1/admin/sources`
```json
{ "items": [ { "stepId": "step_gumasta", "title": "Shop & Establishment registration (Gumasta)",
               "department": "MCGM", "sourceUrl": "https://…",
               "verifiedOn": "2026-09-26", "sourceHealth": "FRESH", "ageDays": 0 } ],
  "meta": { "count": 6, "stale": 0, "ageing": 0 } }
```

### 9. `POST /v1/admin/steps/{stepId}/verify` (P1)
Body optional `{ "note": "checked, fee unchanged" }`. Sets `verifiedOn` to today and returns the updated step. In P0 the dataset is read-only, so this may 501 — say so rather than faking it.

## 4. Error envelope

Every non-2xx response, without exception:

```json
{ "error": { "code": "VALIDATION_FAILED",
             "message": "annualTurnoverInr is required",
             "field": "annualTurnoverInr",
             "details": null } }
```

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Missing or malformed input; `field` names the offender |
| 404 | `PROCEDURE_NOT_FOUND` | Unknown procedureId |
| 404 | `STEP_NOT_FOUND` | Unknown stepId |
| 404 | `ROUTE_NOT_FOUND` | Unknown path |
| 409 | `DATA_INTEGRITY_ERROR` | Cycle, missing source, orphan document; `details` carries the offending ids |
| 500 | `INTERNAL_ERROR` | Anything unhandled; never leak a stack trace to the client |

**The UI branches on `code`, never on `message`.** Messages may be reworded freely; codes may not.

## 5. Conventions

- Lists return `{ items, meta }`. Single objects return the object.
- No pagination in P0; the dataset is small enough that it would be theatre.
- `POST /v1/roadmap` is stateless: the client sends `completedStepIds` every time. The server stores nothing.
- CORS is open in dev only.
