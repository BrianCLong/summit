import type { DetectionRule, RuleContext } from './types';

export class DetectionRuleEngine {
  private readonly rules: DetectionRule[];

  constructor(rules: DetectionRule[] = []) {
    this.rules = rules;
  }

  register(rule: DetectionRule): void {
    this.rules.push(rule);
  }

  evaluate(context: RuleContext): DetectionRule[] {
    const hits: DetectionRule[] = [];
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        hits.push(rule);
      }
    }
    return hits;
  }
}
