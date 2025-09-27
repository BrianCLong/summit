import { Rule } from './RulesEngine';

export class RuleStore {
  private rules: Rule[] = [];

  create(rule: Rule) {
    this.rules.push(rule);
    return rule;
  }

  list() {
    return this.rules;
  }

  listEnabled() {
    return this.rules.filter((r) => r.enabled);
  }
}
