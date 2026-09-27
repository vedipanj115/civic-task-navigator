import { Router } from 'express';
import type { Request, Response } from 'express';

import type { Dataset } from '../data';
import { resolveTask } from '../engine';
import { validateResolveRequest } from '../http/validators';

/** POST /v1/resolve — docs/04-API-CONTRACT.md § 3.5. */
export function createResolveRouter(dataset: Dataset) {
  const router = Router();

  router.post('/resolve', (req: Request, res: Response) => {
    const { query, city } = validateResolveRequest(req.body);
    res.json(resolveTask(query, dataset.procedures, city));
  });

  return router;
}
