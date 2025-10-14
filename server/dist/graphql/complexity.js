import { GraphQLError } from 'graphql';
// Lightweight complexity rule without external deps.
// Counts field selections and rejects overly large queries.
export function complexityRule(max = 1500) {
    return function complexityValidationRule(context) {
        let count = 0;
        return {
            Field() {
                count += 1;
                if (count > max) {
                    context.reportError(new GraphQLError(`Query too complex: ${count} (max ${max})`));
                }
            },
        };
    };
}
//# sourceMappingURL=complexity.js.map