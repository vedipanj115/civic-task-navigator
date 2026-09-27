/**
 * Thrown by buildRoadmap() when cycle detection (docs/03-DEPENDENCY-SPEC.md § 4)
 * finds a cycle in the applicability-pruned prerequisite graph. Callers (the
 * /v1/roadmap route) catch this and translate it into a 409 DATA_INTEGRITY_ERROR
 * with `details.cycle` — see docs/04-API-CONTRACT.md § 4.
 */
export class DataIntegrityError extends Error {
  readonly cycle: string[];

  constructor(cycle: string[]) {
    super(`Prerequisite cycle detected after applicability pruning: ${cycle.join(' -> ')}`);
    this.name = 'DataIntegrityError';
    this.cycle = cycle;
  }
}
