"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDepthCostPlugin = void 0;
const graphql_query_complexity_1 = require("graphql-query-complexity");
const graphql_1 = require("graphql");
function calculateDepth(doc) {
    let depth = 0;
    let maxDepth = 0;
    (0, graphql_1.visit)(doc, {
        enter(node) {
            if (node.selectionSet) {
                depth++;
                if (depth > maxDepth)
                    maxDepth = depth;
            }
        },
        leave(node) {
            if (node.selectionSet)
                depth--;
        },
    });
    return maxDepth;
}
const makeDepthCostPlugin = ({ maxDepth, maxCost, }) => ({
    async requestDidStart({ schema, request }) {
        const doc = (0, graphql_1.parse)(request.query);
        const cost = (0, graphql_query_complexity_1.getComplexity)({
            schema: schema,
            query: doc,
            estimators: [
                (0, graphql_query_complexity_1.fieldExtensionsEstimator)(),
                (0, graphql_query_complexity_1.simpleEstimator)({ defaultComplexity: 1 }),
            ],
            variables: request.variables,
        });
        const depth = calculateDepth(doc);
        if (depth > maxDepth || cost > maxCost) {
            throw Object.assign(new Error(`Query exceeds limits (depth=${depth}, cost=${cost})`), {
                code: 'QUERY_OVER_BUDGET',
            });
        }
        return {};
    },
});
exports.makeDepthCostPlugin = makeDepthCostPlugin;
