import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorResponse } from '@cn/shared';

import { createHealthRouter } from './routes/health';
import { createMetaRouter } from './routes/meta';
import { createProceduresRouter } from './routes/procedures';
import { createResolveRouter } from './routes/resolve';
import { createRoadmapRouter } from './routes/roadmap';
import { createStepsRouter } from './routes/steps';
import { createAdminRouter } from './routes/admin';
import { HttpError } from './http/errors';
import type { Dataset } from './data';

/**
 * Builds the Express app without starting it, so tests (and server.ts)
 * can import it directly. Takes the loaded Dataset so every route reads
 * procedure data through that interface only — never through a raw file
 * or the test fixture directly.
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
  app.use('/v1', createMetaRouter());
  app.use('/v1', createProceduresRouter(dataset));
  app.use('/v1', createResolveRouter(dataset));
  app.use('/v1', createRoadmapRouter(dataset));
  app.use('/v1', createStepsRouter(dataset));
  app.use('/v1', createAdminRouter(dataset));

  // Contract-mandated catch-all (04-API-CONTRACT.md § 1, § 4): unknown routes.
  app.use((_req: Request, res: Response) => {
    const body: ApiErrorResponse = {
      error: { code: 'ROUTE_NOT_FOUND', message: 'No route matches this path.', field: null, details: null },
    };
    res.status(404).json(body);
  });

  // Every route handler above is synchronous, so Express 4 forwards any
  // thrown error here automatically. HttpError (http/errors.ts) carries its
  // own status/code/field/details; anything else is an unexpected bug and
  // must never leak a stack trace to the client (docs/04-API-CONTRACT.md § 4).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json(err.toBody());
      return;
    }
    const body: ApiErrorResponse = {
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', field: null, details: null },
    };
    res.status(500).json(body);
  });

  return app;
}
