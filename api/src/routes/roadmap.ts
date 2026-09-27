import { Router } from 'express';
import type { Request, Response } from 'express';
import type { RoadmapResponse, SourceHealth } from '@cn/shared';

import type { Dataset } from '../data';
import { buildRoadmap, DataIntegrityError } from '../engine';
import { dataIntegrityError, procedureNotFound } from '../http/errors';
import { validateRoadmapRequest } from '../http/validators';
import { sourceHealthOf } from '../lib/source-health';

/** POST /v1/roadmap — docs/04-API-CONTRACT.md § 3.6, the core route. */
export function createRoadmapRouter(dataset: Dataset) {
  const router = Router();

  router.post('/roadmap', (req: Request, res: Response) => {
    // validate request + validate required answers (docs/03 § 2, docs/04 § 3.6)
    const { journeyId, procedureId, answers, completedStepIds } = validateRoadmapRequest(req.body);

    // validate procedure
    const procedure = dataset.procedures.find((p) => p.procedureId === procedureId);
    if (!procedure) {
      throw procedureNotFound(procedureId);
    }

    const stepIds = new Set(procedure.steps.map((s) => s.stepId));
    const prerequisites = dataset.prerequisites.filter((p) => stepIds.has(p.stepId));
    const applicabilityRules = dataset.applicabilityRules.filter((r) => stepIds.has(r.stepId));

    // sourceHealth is date-dependent and computed here at the API boundary,
    // never inside the pure engine (docs/03 § 7, docs/05 § 4).
    const now = new Date();
    const sourceHealthByStepId = new Map<string, SourceHealth>(
      procedure.steps.map((step) => [step.stepId, sourceHealthOf(step.verifiedOn, now)]),
    );

    // run the dependency engine
    try {
      const roadmap: RoadmapResponse = buildRoadmap({
        journeyId,
        procedure,
        prerequisites,
        applicabilityRules,
        documents: dataset.documents,
        answers,
        completedStepIds,
        sourceHealthByStepId,
      });
      res.json(roadmap);
    } catch (err) {
      if (err instanceof DataIntegrityError) {
        throw dataIntegrityError(err.message, { cycle: err.cycle });
      }
      throw err;
    }
  });

  return router;
}
