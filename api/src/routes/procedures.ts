import { Router } from 'express';
import type { Request, Response } from 'express';
import type { City, ProcedureDetailResponse, ProcedureListResponse } from '@cn/shared';

import type { Dataset } from '../data';
import { procedureNotFound } from '../http/errors';

/** GET /v1/procedures, GET /v1/procedures/:procedureId — docs/04 § 3.3-3.4. */
export function createProceduresRouter(dataset: Dataset) {
  const router = Router();

  router.get('/procedures', (req: Request, res: Response) => {
    const cityQuery = req.query.city;
    const city = typeof cityQuery === 'string' ? (cityQuery as City) : undefined;

    const procedures = city ? dataset.procedures.filter((p) => p.city === city) : dataset.procedures;

    const body: ProcedureListResponse = {
      items: procedures.map((p) => ({
        procedureId: p.procedureId,
        name: p.name,
        city: p.city,
        summary: p.summary,
        stepCount: p.steps.length,
      })),
      meta: { count: procedures.length },
    };
    res.json(body);
  });

  router.get('/procedures/:procedureId', (req: Request, res: Response) => {
    const procedure = dataset.procedures.find((p) => p.procedureId === req.params.procedureId);
    if (!procedure) {
      throw procedureNotFound(req.params.procedureId!);
    }
    const body: ProcedureDetailResponse = procedure;
    res.json(body);
  });

  return router;
}
