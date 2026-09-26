# Data contract — Civic Task Navigator

type Step = {
  id: string;
  title: string;
  documents: string[];
  office: string;
  fee: string;
  processingTime: string;
  applyLink: string;
  sourceUrl: string;
  verifiedOn: string;               // ISO date
  dependsOn: string[];               // step ids required first
  dependencyReason: Record<string, string>;  // stepId -> "why" text
};

type ApplicabilityRule = {
  stepId: string;
  appliesIf: string;                 // e.g. "turnover > 20 lakh"
  excludedReason: string;
};

type RoadmapResponse = {
  procedureId: string;
  stages: { stage: number; steps: Step[] }[];
  excludedSteps: { stepId: string; title: string; reason: string }[];
  criticalPathDays: number;
  totalCost: number;
};