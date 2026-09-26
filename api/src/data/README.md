# Data loader — on-disk file convention

This is a note for whoever curates the real dataset (M3), owned by
`api/**` — it is **not** one of the frozen specs under `docs/**`.

`loadDataset({ dataDir })` (`loader.ts`) reads a directory laid out as:

```
<dataDir>/
├─ procedures/
│  └─ <procedureId>.json     # one file per procedure
└─ documents.json
```

## `procedures/<procedureId>.json`

```jsonc
{
  "procedure": {
    // Procedure (docs/02-DOMAIN-MODEL.md § 3) minus `steps`
    "procedureId": "...", "name": "...", "synonyms": ["..."],
    "city": "MUMBAI", "appliesTo": { "entityTypes": [], "activities": [] },
    "summary": "..."
  },
  "steps": [ /* Step[] — docs/02 § 4 */ ],
  "prerequisites": [ /* Prerequisite[] — docs/02 § 5 */ ],
  "applicabilityRules": [ /* ApplicabilityRule[] — docs/02 § 7 */ ]
}
```

## `documents.json`

```jsonc
{ "documents": [ /* Document[] — docs/02 § 6 */ ] }
```

Every nested shape (`Step`, `Prerequisite`, `ApplicabilityRule`, `Document`)
is exactly the frozen type in `shared/src/domain.ts`. This file only
documents the *on-disk layout* those objects are grouped into, which is a
loader convention, not part of the frozen contract.

## Boot-time validation

`validate.ts` checks, once per process, before the server starts serving
anything (see `docs/03-DEPENDENCY-SPEC.md` § 4 and Invariants S1/P1):

- every step has a non-empty `sourceUrl` and a valid `verifiedOn`
- every `requiresDocumentIds` / `producesDocumentIds` entry exists in
  `documents.json`
- every `ISSUED_BY_STEP` document has a real, consistent producing step
- every prerequisite references real steps
- the prerequisite graph has no cycles
- procedure/step ids are unique and correctly linked

Any failure throws `DataValidationError` (with every problem found, not
just the first) instead of starting the server. Nothing is silently
repaired or invented.

## Switching from the test fixture to the real dataset

The loader and validator do not know or care where `dataDir` points — the
same `loadDataset()` call is used for both. Nothing in `api/src/data/`,
`api/src/engine/` (dependency engine), or `api/src/routes/` needs to
change when M3's real data lands.

**The only thing that changes is `DATA_DIR`** (`api/.env`, see
`.env.example`): point it at the real `data/` directory instead of
`api/src/__tests__/fixtures/dataset` — provided M3's files follow the
convention above. If the real data's natural shape needs to differ from
this convention, that's a change to this README and to `types.ts` /
`loader.ts` only; it is never a reason to touch `docs/02`, `docs/03`,
`docs/04`, or `shared/src/domain.ts` / `api.ts`, since none of those
specify a file layout — only the object shapes.
