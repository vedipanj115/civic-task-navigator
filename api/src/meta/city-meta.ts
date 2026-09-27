import type { City, CityMeta, EnumLabels, MetaCitiesResponse } from '@cn/shared';

/**
 * Every City the frozen domain model currently defines (shared/src/domain.ts:
 * `export type City = 'MUMBAI'`) and the answer fields each one asks for.
 * Not derived from the dataset because it describes the *question set* the
 * UI presents, not procedure data — there's exactly one city today, so this
 * is a small constant, not "hardcoded procedure-specific logic": nothing
 * here names a procedure or a step.
 */
export const CITIES: City[] = ['MUMBAI'];

const CITY_METAS: CityMeta[] = [
  {
    city: 'MUMBAI',
    label: 'Mumbai, Maharashtra',
    requiredAnswers: ['entityType', 'activity', 'annualTurnoverInr', 'premisesType'],
    optionalAnswers: ['seatingCapacity', 'employeeCount'],
  },
];

const ENUM_LABELS: EnumLabels = {
  entityType: {
    PROPRIETORSHIP: 'Sole proprietorship',
    PARTNERSHIP: 'Partnership',
    PRIVATE_LIMITED: 'Private limited company',
    LLP: 'LLP',
  },
  activity: {
    FOOD_SERVICE: 'Food service',
    RETAIL: 'Retail shop',
    SERVICES: 'Services',
    MANUFACTURING: 'Manufacturing',
  },
  premisesType: {
    RENTED: 'Rented',
    OWNED: 'Owned',
  },
  stepStatus: {
    AVAILABLE: 'Ready to start',
    BLOCKED: 'Blocked',
    COMPLETED: 'Done',
    NOT_APPLICABLE: 'Not applicable',
  },
  sourceHealth: {
    FRESH: 'Verified recently',
    AGEING: 'Verify soon',
    STALE: 'Needs re-check',
  },
};

export function getMetaCitiesResponse(): MetaCitiesResponse {
  return { cities: CITY_METAS, enumLabels: ENUM_LABELS };
}
