import { Router } from 'express';
import type { Request, Response } from 'express';
import type { StepDetailResponse } from '@cn/shared';

import type { Dataset } from '../data';
import { stepNotFound } from '../http/errors';
import { sourceHealthOf } from '../lib/source-health';

/** GET /v1/steps/:stepId — docs/04-API-CONTRACT.md § 3.7. */
export function createStepsRouter(dataset: Dataset) {
  const router = Router();

  router.get('/steps/:stepId', (req: Request, res: Response) => {
    const { stepId } = req.params;
    const step = dataset.procedures.flatMap((p) => p.steps).find((s) => s.stepId === stepId);
    if (!step) {
      throw stepNotFound(stepId!);
    }

    const documentById = new Map(dataset.documents.map((d) => [d.documentId, d]));
    const documents = step.requiresDocumentIds
      .map((docId) => documentById.get(docId))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);

    const prerequisites = dataset.prerequisites
      .filter((p) => p.stepId === stepId)
      .map(({ dependsOnStepId, type, reason, sourceUrl }) => ({ dependsOnStepId, type, reason, sourceUrl }));

    const body: StepDetailResponse = {
      step,
      documents,
      prerequisites,
      sourceHealth: sourceHealthOf(step.verifiedOn, new Date()),
    };
    res.json(body);
  });

  return router;
}
