import { Router } from 'express';
import type { Request, Response } from 'express';

import { getMetaCitiesResponse } from '../meta/city-meta';

/** GET /v1/meta/cities — docs/04-API-CONTRACT.md § 3.2. */
export function createMetaRouter() {
  const router = Router();

  router.get('/meta/cities', (_req: Request, res: Response) => {
    res.json(getMetaCitiesResponse());
  });

  return router;
}
