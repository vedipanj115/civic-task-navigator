import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { ApplicabilityRule, Prerequisite, Procedure } from '@cn/shared';

import type { Dataset, RawDocumentsFile, RawProcedureFile } from './types';
import { assertValidDataset } from './validate';

export interface LoadDatasetOptions {
  /** Directory containing `procedures/*.json` and `documents.json` — see ./README.md. */
  dataDir: string;
}

/**
 * Loads every procedure file and the documents file from `dataDir`,
 * assembles them into a Dataset, validates it, and returns it.
 *
 * Throws DataValidationError if the dataset fails validation (see
 * validate.ts), or lets a plain Node fs error propagate if the directory
 * or a file is missing. Never repairs data and never returns a
 * partially-valid dataset — the caller (server.ts) is expected to let
 * this throw fail the boot.
 *
 * Deliberately unaware of *where* `dataDir` points: pass the test fixture
 * directory (api/src/__tests__/fixtures/dataset) during development, or
 * the real `data/` directory once M3's dataset exists — same function,
 * same validation, no code change either way (see ./README.md).
 */
export function loadDataset({ dataDir }: LoadDatasetOptions): Dataset {
  const proceduresDir = join(dataDir, 'procedures');
  const procedureFileNames = readdirSync(proceduresDir)
    .filter((name) => name.endsWith('.json'))
    .sort(); // deterministic load order regardless of filesystem enumeration order

  const procedures: Procedure[] = [];
  const prerequisites: Prerequisite[] = [];
  const applicabilityRules: ApplicabilityRule[] = [];

  for (const fileName of procedureFileNames) {
    const raw = readJsonFile<RawProcedureFile>(join(proceduresDir, fileName));
    procedures.push({ ...raw.procedure, steps: raw.steps });
    prerequisites.push(...raw.prerequisites);
    applicabilityRules.push(...raw.applicabilityRules);
  }

  const rawDocuments = readJsonFile<RawDocumentsFile>(join(dataDir, 'documents.json'));

  const dataset: Dataset = {
    procedures,
    documents: rawDocuments.documents,
    prerequisites,
    applicabilityRules,
    dataVersion: computeDataVersion(procedures),
  };

  assertValidDataset(dataset);

  return dataset;
}

function readJsonFile<T>(path: string): T {
  const contents = readFileSync(path, 'utf-8');
  return JSON.parse(contents) as T;
}

/**
 * The dataset's "version" is derived from the data itself — the latest
 * `verifiedOn` across every step — rather than read from the clock or an
 * invented manifest file. This keeps the loader deterministic, matching
 * docs/05-ARCHITECTURE.md § 4 ("the engine reads no clock"): loading the
 * same files twice always yields the same dataVersion.
 */
function computeDataVersion(procedures: Procedure[]): string {
  const verifiedDates = procedures
    .flatMap((procedure) => procedure.steps.map((step) => step.verifiedOn))
    .filter((date): date is string => Boolean(date));
  if (verifiedDates.length === 0) return 'unknown';
  return [...verifiedDates].sort().at(-1) as string;
}
