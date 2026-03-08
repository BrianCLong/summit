"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complexityRule = complexityRule;
const graphql_1 = require("graphql");
// Lightweight complexity rule without external deps.
// Counts field selections and rejects overly large queries.
function complexityRule(max = 1500) {
    return function complexityValidationRule(context) {
        let count = 0;
        return {
            Field() {
                count += 1;
                if (count > max) {
                    context.reportError(new graphql_1.GraphQLError(`Query too complex: ${count} (max ${max})`));
                }
            },
        };
    };
}
