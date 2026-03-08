"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planFederatedQuery = planFederatedQuery;
/**
 * planFederatedQuery creates a simple plan that maps each enclave
 * to the provided query. This is a placeholder for the future planner
 * that will push down policies and compile subqueries per enclave.
 */
function planFederatedQuery(query, enclaves) {
    return {
        enclaves,
        subqueries: enclaves.reduce((acc, id) => {
            acc[id] = query;
            return acc;
        }, {}),
    };
}
