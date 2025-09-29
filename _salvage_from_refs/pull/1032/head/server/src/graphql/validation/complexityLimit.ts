import { createComplexityLimitRule } from 'graphql-validation-complexity';

export function complexityLimit(maxCost: number = 1000) {
  return createComplexityLimitRule(maxCost, {
    onCost: () => {},
    formatErrorMessage: (cost: number) => `Query is too complex: cost ${cost} exceeds ${maxCost}`,
  });
}
