import type { SourceHealth } from '@cn/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * docs/02-DOMAIN-MODEL.md § 2: FRESH <= 30 days since verifiedOn, AGEING <= 90,
 * else STALE. `now` is a parameter (never `new Date()` internally) so this stays
 * unit-testable without mocking the clock; callers pass `new Date()` at the
 * actual API boundary (routes/steps.ts, routes/roadmap.ts, routes/admin.ts).
 */
export function ageDaysOf(verifiedOn: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(verifiedOn).getTime()) / DAY_MS);
}

export function sourceHealthOf(verifiedOn: string, now: Date): SourceHealth {
  const ageDays = ageDaysOf(verifiedOn, now);
  if (ageDays <= 30) return 'FRESH';
  if (ageDays <= 90) return 'AGEING';
  return 'STALE';
}
