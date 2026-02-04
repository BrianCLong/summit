import { RedactionRule } from './types.js';

export interface RedactionResult {
  value: string;
  applied: string[];
}

export function applyRedactions(
  value: string,
  rules: RedactionRule[],
): RedactionResult {
  let output = value;
  const applied: string[] = [];
  for (const rule of rules) {
    if (rule.pattern.test(output)) {
      output = output.replace(rule.pattern, rule.replacement ?? '[REDACTED]');
      applied.push(rule.name);
    }
    rule.pattern.lastIndex = 0;
  }
  return { value: output, applied };
}
