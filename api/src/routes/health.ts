import { Router } from 'express';
import type { Request, Response } from 'express';
import type { HealthResponse } from '@cn/shared';

import type { Dataset } from '../data';

/**
 * GET /v1/health — docs/04-API-CONTRACT.md § 3.1.
 *
 * `dataVersion` and `procedureCount` now come from the loaded Dataset
 * (Step 4's data loader) rather than the Step 3 placeholders. Takes the
 * dataset as a parameter — this route (and every future one) reads
 * procedure data only through the Dataset interface, never through a raw
 * file or the test fixture directly.
 */
export function createHealthRouter(dataset: Dataset) {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    const body: HealthResponse = {
      status: 'ok',
      dataVersion: dataset.dataVersion,
      procedureCount: dataset.procedures.length,
    };
    res.json(body);
  });

  return router;
}
