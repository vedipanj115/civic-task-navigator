import type { Activity, City, EntityType, JourneyAnswers, PremisesType, ResolveRequest, RoadmapRequest } from '@cn/shared';

import { CITIES } from '../meta/city-meta';
import { validationFailed } from './errors';

const ENTITY_TYPES: EntityType[] = ['PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'LLP'];
const ACTIVITIES: Activity[] = ['FOOD_SERVICE', 'RETAIL', 'SERVICES', 'MANUFACTURING'];
const PREMISES_TYPES: PremisesType[] = ['RENTED', 'OWNED'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateResolveRequest(body: unknown): ResolveRequest {
  if (!isRecord(body) || typeof body.query !== 'string' || body.query.trim() === '') {
    throw validationFailed('query is required', 'query');
  }
  const city = body.city;
  if (city !== undefined && !CITIES.includes(city as City)) {
    throw validationFailed(`Unknown city "${String(city)}".`, 'city');
  }
  return { query: body.query, city: city as City | undefined };
}

/** docs/03 § 2 / docs/04 § 3.6 — every required JourneyAnswers field, in the
 * order the frozen error contract's `field` name should surface them. */
function validateAnswers(answers: unknown): JourneyAnswers {
  if (!isRecord(answers)) {
    throw validationFailed('answers is required', 'answers');
  }

  const city = answers.city;
  if (typeof city !== 'string' || !CITIES.includes(city as City)) {
    throw validationFailed('answers.city is required', 'city');
  }

  const entityType = answers.entityType;
  if (typeof entityType !== 'string' || !ENTITY_TYPES.includes(entityType as EntityType)) {
    throw validationFailed('answers.entityType is required', 'entityType');
  }

  const activity = answers.activity;
  if (typeof activity !== 'string' || !ACTIVITIES.includes(activity as Activity)) {
    throw validationFailed('answers.activity is required', 'activity');
  }

  const annualTurnoverInr = answers.annualTurnoverInr;
  if (typeof annualTurnoverInr !== 'number' || !Number.isFinite(annualTurnoverInr)) {
    throw validationFailed('answers.annualTurnoverInr is required', 'annualTurnoverInr');
  }

  const premisesType = answers.premisesType;
  if (typeof premisesType !== 'string' || !PREMISES_TYPES.includes(premisesType as PremisesType)) {
    throw validationFailed('answers.premisesType is required', 'premisesType');
  }

  const seatingCapacity = answers.seatingCapacity;
  if (seatingCapacity !== undefined && typeof seatingCapacity !== 'number') {
    throw validationFailed('answers.seatingCapacity must be a number', 'seatingCapacity');
  }

  const employeeCount = answers.employeeCount;
  if (employeeCount !== undefined && typeof employeeCount !== 'number') {
    throw validationFailed('answers.employeeCount must be a number', 'employeeCount');
  }

  return {
    city: city as City,
    entityType: entityType as EntityType,
    activity: activity as Activity,
    annualTurnoverInr,
    premisesType: premisesType as PremisesType,
    seatingCapacity: seatingCapacity as number | undefined,
    employeeCount: employeeCount as number | undefined,
  };
}

export function validateRoadmapRequest(body: unknown): RoadmapRequest {
  if (!isRecord(body)) {
    throw validationFailed('request body is required');
  }

  if (typeof body.journeyId !== 'string' || body.journeyId.trim() === '') {
    throw validationFailed('journeyId is required', 'journeyId');
  }

  if (typeof body.procedureId !== 'string' || body.procedureId.trim() === '') {
    throw validationFailed('procedureId is required', 'procedureId');
  }

  const answers = validateAnswers(body.answers);

  const completedStepIds = Array.isArray(body.completedStepIds)
    ? body.completedStepIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    journeyId: body.journeyId,
    procedureId: body.procedureId,
    answers,
    completedStepIds,
  };
}
