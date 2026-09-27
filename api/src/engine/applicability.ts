import type { ApplicabilityRule, ExcludedStep, JourneyAnswers, RuleOperator, Step } from '@cn/shared';

export interface ApplicabilityResult {
  applicableSteps: Step[];
  excluded: ExcludedStep[];
}

/**
 * Evaluates one rule's operator against the answer value. Returns false
 * (never throws) for a comparison that doesn't make sense for the given
 * types — the caller treats "not passed" as an exclusion, which is the
 * safe direction per docs/03 § 2: "we never guess on the citizen's behalf."
 */
function evaluateOperator(operator: RuleOperator, actual: string | number, expected: ApplicabilityRule['value']): boolean {
  switch (operator) {
    case 'EQ':
      return actual === expected;
    case 'NEQ':
      return actual !== expected;
    case 'LT':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'LTE':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'GT':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'GTE':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'IN':
      return Array.isArray(expected) && (expected as Array<string | number>).includes(actual);
    default:
      return false;
  }
}

/**
 * docs/03-DEPENDENCY-SPEC.md § 2:
 *  - rules on the same step are ANDed; no rules = included.
 *  - the first failing rule supplies the exclusionReason.
 *  - a rule referencing an undefined answer field fails (never guessed).
 */
export function evaluateApplicability(
  steps: Step[],
  rules: ApplicabilityRule[],
  answers: JourneyAnswers,
): ApplicabilityResult {
  const rulesByStep = new Map<string, ApplicabilityRule[]>();
  for (const rule of rules) {
    const list = rulesByStep.get(rule.stepId);
    if (list) {
      list.push(rule);
    } else {
      rulesByStep.set(rule.stepId, [rule]);
    }
  }

  const applicableSteps: Step[] = [];
  const excluded: ExcludedStep[] = [];

  for (const step of steps) {
    const stepRules = rulesByStep.get(step.stepId) ?? [];
    let failingRule: ApplicabilityRule | undefined;

    for (const rule of stepRules) {
      const actual = (answers as unknown as Record<string, string | number | undefined>)[rule.field];
      const passed = actual !== undefined && evaluateOperator(rule.operator, actual, rule.value);
      if (!passed) {
        failingRule = rule;
        break;
      }
    }

    if (failingRule) {
      excluded.push({ stepId: step.stepId, title: step.title, reason: failingRule.exclusionReason });
    } else {
      applicableSteps.push(step);
    }
  }

  return { applicableSteps, excluded };
}
