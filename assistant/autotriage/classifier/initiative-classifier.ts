import { TriageItem } from '../types.js';
import { InitiativeRule } from '../config.js';

export function classifyInitiative(item: TriageItem, rules: InitiativeRule[]): string | undefined {
  const text = `${item.title} ${item.description}`.toLowerCase();

  for (const rule of rules) {
    // Check keywords
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.id;
    }

    // Check patterns
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.id;
    }
  }

  return undefined;
}
