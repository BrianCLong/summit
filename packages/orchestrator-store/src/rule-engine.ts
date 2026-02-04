// packages/orchestrator-store/src/rule-engine.ts

export interface Rule {
  id: string;
  condition: (facts: any) => boolean;
  consequence: (facts: any) => any;
  priority?: number;
}

export interface RuleResult {
  events: any[];
  facts: any;
}

export class RuleEngine {
  private rules: Rule[] = [];

  constructor(ruleset?: Rule[]) {
    if (ruleset) {
      this.rules = ruleset;
    }
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
    // Sort rules by priority if provided
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async run(facts: any): Promise<RuleResult> {
    const events: any[] = [];
    let currentFacts = { ...facts };

    // Process rules until no more rules fire
    let fired = true;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    while (fired && iterations < maxIterations) {
      fired = false;
      iterations++;

      for (const rule of this.rules) {
        if (rule.condition(currentFacts)) {
          const result = rule.consequence(currentFacts);
          currentFacts = { ...currentFacts, ...result.facts };
          events.push(...result.events || []);
          fired = true;
        }
      }
    }

    return {
      events,
      facts: currentFacts
    };
  }
}