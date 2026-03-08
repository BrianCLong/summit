"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.federatedQueryPlanner = exports.FederatedQueryPlanner = void 0;
const logger_js_1 = require("../../config/logger.js");
const GlobalTrafficSteering_js_1 = require("./GlobalTrafficSteering.js");
const DifferentialPrivacyService_js_1 = require("../../services/DifferentialPrivacyService.js");
/**
 * Service for Federated Mesh Query Planning (Task #111 & #113).
 * Decomposes global queries into regional execution units and guards results with DP.
 */
class FederatedQueryPlanner {
    static instance;
    constructor() { }
    static getInstance() {
        if (!FederatedQueryPlanner.instance) {
            FederatedQueryPlanner.instance = new FederatedQueryPlanner();
        }
        return FederatedQueryPlanner.instance;
    }
    /**
     * Plans a global query execution across the region mesh.
     */
    async planQuery(query, tenantId, params = {}) {
        logger_js_1.logger.info({ query, tenantId }, 'FederatedQueryPlanner: Planning execution');
        const decision = await GlobalTrafficSteering_js_1.globalTrafficSteering.resolveRegion(tenantId);
        const targetRegions = [decision.targetRegion];
        if (params.globalSearch === true) {
            targetRegions.push('eu-central-1', 'ap-southeast-1');
        }
        const subQueries = [];
        for (const region of targetRegions) {
            const pushedDownFilters = [];
            if (query.includes('WHERE')) {
                pushedDownFilters.push('temporal_filter');
                pushedDownFilters.push('tenant_isolation');
            }
            subQueries.push({
                region,
                query: this.rewriteForRegion(query, region),
                params: { ...params, tenantId },
                pushedDownFilters
            });
        }
        return {
            originalQuery: query,
            subQueries,
            mergeStrategy: query.toLowerCase().includes('count') ? 'AGGREGATE' : 'UNION'
        };
    }
    /**
     * Executes the plan and applies Sovereign Guards (DP).
     */
    async executeFederatedQuery(plan) {
        // Simulate execution results
        const rawResults = plan.subQueries.map(sq => {
            if (plan.mergeStrategy === 'AGGREGATE') {
                return { region: sq.region, value: Math.floor(Math.random() * 100) };
            }
            return { region: sq.region, data: 'Simulated Result' };
        });
        // If cross-region aggregation, apply Differential Privacy
        if (plan.mergeStrategy === 'AGGREGATE' && plan.subQueries.length > 1) {
            const total = rawResults.reduce((acc, curr) => acc + curr.value, 0);
            // Apply DP to the aggregate
            const guarded = DifferentialPrivacyService_js_1.differentialPrivacyService.guardResult({ value: total }, 'AGGREGATE');
            logger_js_1.logger.info({ original: total, guarded: guarded.value }, 'FederatedQueryPlanner: Applied DP to sovereign aggregate');
            return guarded;
        }
        return rawResults;
    }
    rewriteForRegion(query, region) {
        return `/* Region: ${region} */ ${query}`;
    }
}
exports.FederatedQueryPlanner = FederatedQueryPlanner;
exports.federatedQueryPlanner = FederatedQueryPlanner.getInstance();
