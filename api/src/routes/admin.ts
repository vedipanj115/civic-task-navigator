import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AdminSourcesResponse } from '@cn/shared';

import type { Dataset } from '../data';
import { notImplemented } from '../http/errors';
import { ageDaysOf, sourceHealthOf } from '../lib/source-health';

/** GET /v1/admin/sources, POST /v1/admin/steps/:stepId/verify — docs/04 § 3.8-3.9. */
export function createAdminRouter(dataset: Dataset) {
  const router = Router();

  router.get('/admin/sources', (_req: Request, res: Response) => {
    const now = new Date();

    const items = dataset.procedures
      .flatMap((p) => p.steps)
      .map((step) => ({
        stepId: step.stepId,
        title: step.title,
        department: step.department,
        sourceUrl: step.sourceUrl,
        verifiedOn: step.verifiedOn,
        sourceHealth: sourceHealthOf(step.verifiedOn, now),
        ageDays: ageDaysOf(step.verifiedOn, now),
      }))
      // sorted stale first (oldest first puts STALE, then AGEING, then FRESH)
      .sort((a, b) => b.ageDays - a.ageDays || a.stepId.localeCompare(b.stepId));

    const body: AdminSourcesResponse = {
      items,
      meta: {
        count: items.length,
        stale: items.filter((i) => i.sourceHealth === 'STALE').length,
        ageing: items.filter((i) => i.sourceHealth === 'AGEING').length,
      },
    };
    res.json(body);
  });

  // P1 — the dataset is read-only in P0 (docs/04 § 3.9), so this says so rather than faking it.
  router.post('/admin/steps/:stepId/verify', (_req: Request, res: Response) => {
    throw notImplemented('Re-verifying steps is not implemented in P0 — the dataset is read-only.');
  });

  return router;
}
