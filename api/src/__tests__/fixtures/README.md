# Test fixture — not real data

Everything under this directory is fictional and exists only so
`api/src/__tests__/data-loader.test.ts` (and local dev, if you point
`DATA_DIR` here) can run without M3's real dataset.

- Not real government data.
- Not the production dataset — that lives in `data/**` at the repo root
  (M3-owned) and is never modified here.
- Follows the same on-disk convention documented in
  `api/src/data/README.md`, so the loader in `api/src/data/loader.ts` can
  read this directory or the real `data/` directory with no code change.
