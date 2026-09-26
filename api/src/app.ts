import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorResponse } from '@cn/shared';

import { createHealthRouter } from './routes/health';
import type { Dataset } from './data';

/**
 * Builds the Express app without starting it, so tests (and server.ts)
 * can import it directly. Takes the loaded Dataset so every route reads
 * procedure data through that interface only — never through a raw file
 * or the test fixture directly. Route handlers beyond /v1/health are
 * added in later steps as the engine lands.
 */
export function createApp(dataset: Dataset) {
  const app = express();

  app.use(express.json());

  // CORS is open in dev only (docs/04-API-CONTRACT.md § 1, § 5).
  // Hand-rolled rather than adding the `cors` package for one header set.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use('/v1', createHealthRouter(dataset));

  // Contract-mandated catch-alls (04-API-CONTRACT.md § 1, § 4). All other
  // error codes are left for the routes that actually produce them.
  app.use((_req: Request, res: Response) => {
    const body: ApiErrorResponse = {
      error: { code: 'ROUTE_NOT_FOUND', message: 'No route matches this path.', field: null, details: null },
    };
    res.status(404).json(body);
  });

  app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const body: ApiErrorResponse = {
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', field: null, details: null },
    };
    res.status(500).json(body);
  });

  return app;
}
