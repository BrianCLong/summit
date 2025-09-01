import { createComplexityLimitRule } from 'graphql-validation-complexity';
export function complexityLimit(maxCost = 1000) {
    return createComplexityLimitRule(maxCost, {
        onCost: () => { },
        formatErrorMessage: (cost) => `Query is too complex: cost ${cost} exceeds ${maxCost}`,
    });
}
//# sourceMappingURL=complexityLimit.js.map