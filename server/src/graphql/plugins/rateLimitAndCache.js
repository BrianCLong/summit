"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitAndCachePlugin = void 0;
const graphql_1 = require("graphql");
const graphql_query_complexity_1 = require("graphql-query-complexity");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
const rateLimitAndCachePlugin = (schema) => {
    return {
        async requestDidStart() {
            return {
                async didResolveOperation({ request, document }) {
                    /**
                     * Complexity Analysis
                     */
                    const complexity = (0, graphql_query_complexity_1.getComplexity)({
                        schema,
                        operationName: request.operationName,
                        query: document,
                        variables: request.variables,
                        estimators: [
                            (0, graphql_query_complexity_1.fieldExtensionsEstimator)(),
                            (0, graphql_query_complexity_1.simpleEstimator)({ defaultComplexity: 1 }),
                        ],
                    });
                    // Hard limit for complexity
                    const MAX_COMPLEXITY = 1000;
                    if (complexity > MAX_COMPLEXITY) {
                        throw new graphql_1.GraphQLError(`Query is too complex: ${complexity}. Maximum allowed is ${MAX_COMPLEXITY}.`, {
                            extensions: {
                                code: 'QUERY_TOO_COMPLEX',
                            }
                        });
                    }
                },
                async willSendResponse({ request, response }) {
                    // We could cache whole responses here if we can generate a stable key
                    // For now, we rely on resolver-level caching via CacheService for granularity
                }
            };
        },
    };
};
exports.rateLimitAndCachePlugin = rateLimitAndCachePlugin;
