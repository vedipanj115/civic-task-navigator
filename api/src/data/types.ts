import type { ApplicabilityRule, Document, Prerequisite, Procedure, Step } from '@cn/shared';

/**
 * On-disk shape of one `<dataDir>/procedures/<id>.json` file.
 *
 * This is a loader-internal convention, NOT part of the frozen contract —
 * docs/02-DOMAIN-MODEL.md and docs/04-API-CONTRACT.md specify the
 * domain/API *types* (Procedure, Step, Prerequisite, ...), not how they're
 * laid out on disk. The convention is documented in ./README.md so M3's
 * real dataset can follow it; changing it later means editing this file
 * and loader.ts only, never the frozen docs or shared/src/*.
 */
export interface RawProcedureFile {
  procedure: Omit<Procedure, 'steps'>;
  steps: Step[];
  prerequisites: Prerequisite[];
  applicabilityRules: ApplicabilityRule[];
}

/** On-disk shape of `<dataDir>/documents.json`. */
export interface RawDocumentsFile {
  documents: Document[];
}

/**
 * The fully assembled, boot-validated in-memory dataset. Built once by
 * loadDataset() (loader.ts) and never mutated after. The dependency
 * engine and every route are meant to read procedure data through this
 * shape only — never through a raw file, and never through the test
 * fixture directly.
 */
export interface Dataset {
  /** Each procedure with its own `steps` already attached. */
  procedures: Procedure[];
  documents: Document[];
  /** Flattened across all procedures. */
  prerequisites: Prerequisite[];
  /** Flattened across all procedures. */
  applicabilityRules: ApplicabilityRule[];
  /** Derived from the data itself — see loader.ts computeDataVersion(). */
  dataVersion: string;
}
