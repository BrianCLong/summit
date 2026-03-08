"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsResolvers = void 0;
const GraphAnalyticsService_js_1 = require("../../services/GraphAnalyticsService.js");
exports.analyticsResolvers = {
    Query: {
        shortestPath: async (_, args, context) => {
            const { from, to, maxDepth } = args;
            return GraphAnalyticsService_js_1.Neo4jGraphAnalyticsService.getInstance().shortestPath({
                tenantId: context.user?.tenantId || 'default',
                from,
                to,
                maxDepth
            });
        },
        centrality: async (_, args, context) => {
            const { scope, algorithm } = args;
            return GraphAnalyticsService_js_1.Neo4jGraphAnalyticsService.getInstance().centrality({
                tenantId: context.user?.tenantId || 'default',
                scope,
                algorithm
            });
        },
        detectAnomalies: async (_, args, context) => {
            const { scope, kind } = args;
            return GraphAnalyticsService_js_1.Neo4jGraphAnalyticsService.getInstance().detectAnomalies({
                tenantId: context.user?.tenantId || 'default',
                scope,
                kind
            });
        },
        temporalMotifs: async (_, args, context) => {
            const { scope } = args;
            return GraphAnalyticsService_js_1.Neo4jGraphAnalyticsService.getInstance().temporalMotifs({
                tenantId: context.user?.tenantId || 'default',
                scope
            });
        }
    }
};
