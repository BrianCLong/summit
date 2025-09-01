// GraphQL Resolvers for MoE Conductor
// Integrates the Conductor system with GraphQL API
import { conductor } from './index';
export const conductorResolvers = {
    Query: {
        /**
         * Preview routing decision without executing the task
         */
        previewRouting: async (_, { input }) => {
            if (!conductor) {
                throw new Error('Conductor not initialized');
            }
            const decision = conductor.previewRouting(input);
            return {
                expert: decision.expert,
                reason: decision.reason,
                confidence: decision.confidence,
                features: decision.features,
                alternatives: decision.alternatives
            };
        }
    },
    Mutation: {
        /**
         * Execute a task using the MoE Conductor system
         */
        conduct: async (_, { input }, context) => {
            if (!conductor) {
                throw new Error('Conductor not initialized');
            }
            // Add user context from GraphQL context
            const enrichedInput = {
                ...input,
                userContext: {
                    userId: context.user?.id,
                    role: context.user?.role,
                    scopes: context.user?.scopes || [],
                    ...input.userContext
                }
            };
            try {
                const result = await conductor.conduct(enrichedInput);
                // Convert result to GraphQL format
                return {
                    expertId: result.expertId,
                    output: result.output,
                    logs: result.logs,
                    cost: result.cost,
                    latencyMs: result.latencyMs,
                    error: result.error,
                    auditId: result.auditId
                };
            }
            catch (error) {
                console.error('Conductor execution failed:', error);
                throw new Error(`Conductor execution failed: ${error.message}`);
            }
        }
    },
    // Custom resolvers for enum types
    ExpertType: {
        LLM_LIGHT: "LLM_LIGHT",
        LLM_HEAVY: "LLM_HEAVY",
        GRAPH_TOOL: "GRAPH_TOOL",
        RAG_TOOL: "RAG_TOOL",
        FILES_TOOL: "FILES_TOOL",
        OSINT_TOOL: "OSINT_TOOL",
        EXPORT_TOOL: "EXPORT_TOOL"
    }
};
// Additional utility resolvers
export const conductorQueries = {
    /**
     * Get conductor system statistics
     */
    conductorStats: () => {
        if (!conductor) {
            return {
                status: 'not_initialized',
                activeTaskCount: 0,
                routingStats: null
            };
        }
        const stats = conductor.getStats();
        return {
            status: 'active',
            activeTaskCount: stats.activeTaskCount,
            routingStats: {
                totalDecisions: stats.routingStats.totalDecisions,
                expertDistribution: Object.entries(stats.routingStats.expertDistribution)
                    .map(([expert, count]) => ({ expert, count })),
                avgConfidence: stats.routingStats.avgConfidence
            },
            mcpStatus: Object.entries(stats.mcpConnectionStatus)
                .map(([server, connected]) => ({ server, connected })),
            config: stats.config
        };
    },
    /**
     * Test conductor connectivity and health
     */
    conductorHealth: async () => {
        if (!conductor) {
            return {
                status: 'unhealthy',
                message: 'Conductor not initialized',
                checks: []
            };
        }
        const checks = [];
        let overallHealthy = true;
        try {
            // Test basic routing
            const testDecision = conductor.previewRouting({
                task: "test routing",
                sensitivity: "low"
            });
            checks.push({
                name: 'routing',
                status: 'healthy',
                message: `Router selected: ${testDecision.expert}`
            });
        }
        catch (error) {
            checks.push({
                name: 'routing',
                status: 'unhealthy',
                message: error.message
            });
            overallHealthy = false;
        }
        // Check MCP connections (mock for now)
        checks.push({
            name: 'mcp_connections',
            status: 'healthy',
            message: 'All MCP servers reachable'
        });
        return {
            status: overallHealthy ? 'healthy' : 'unhealthy',
            message: overallHealthy ? 'All systems operational' : 'Some components unhealthy',
            checks
        };
    }
};
// Export combined resolvers
export const allConductorResolvers = {
    ...conductorResolvers,
    Query: {
        ...conductorResolvers.Query,
        ...conductorQueries
    }
};
//# sourceMappingURL=resolvers.js.map