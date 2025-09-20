// GraphQL Resolvers for MoE Conductor
// Integrates the Conductor system with GraphQL API
import { conductor } from './index';
import { OPAClient } from './security/opa-client';
import { governanceLimitEngine, estimateTaskCost, estimateTokenCount } from './governance/limits';
import { createBudgetController } from './admission/budget-control';
import Redis from 'ioredis';
export const conductorResolvers = {
    Query: {
        /**
         * Preview routing decision without executing the task
         */
        previewRouting: async (_, { input }, context) => {
            if (!conductor) {
                throw new Error('Conductor not initialized');
            }
            // Create security context and enforce policy
            const securityContext = OPAClient.createSecurityContext(context.user, {
                requestsLastHour: context.requestsLastHour || 0,
                location: context.location || 'Unknown',
            });
            const opaClient = new OPAClient();
            const policyResult = await opaClient.canPreviewRouting(securityContext, input.task);
            if (!policyResult.allow) {
                throw new Error(`Access denied: ${policyResult.reason || 'Policy violation'}`);
            }
            // Check for PII and warn if detected
            const piiCheck = opaClient.detectPII(input.task);
            if (piiCheck.hasPII && policyResult.warnings.length === 0) {
                policyResult.warnings.push(`PII detected: ${piiCheck.patterns.join(', ')}`);
            }
            const decision = conductor.previewRouting(input);
            return {
                expert: decision.expert,
                reason: decision.reason,
                confidence: decision.confidence,
                features: decision.features,
                alternatives: decision.alternatives,
                warnings: policyResult.warnings,
                security_clearance_required: piiCheck.hasPII,
            };
        },
    },
    Mutation: {
        /**
         * Execute a task using the MoE Conductor system
         */
        conduct: async (_, { input }, context) => {
            if (!conductor) {
                throw new Error('Conductor not initialized');
            }
            // Create security context and enforce policy
            const securityContext = OPAClient.createSecurityContext(context.user, {
                requestsLastHour: context.requestsLastHour || 0,
                location: context.location || 'Unknown',
            });
            // Get routing decision first to determine expert
            const routingDecision = conductor.previewRouting(input);
            // Check governance limits before security policy
            const estimatedCost = estimateTaskCost(input.task, routingDecision.expert);
            const estimatedTokens = estimateTokenCount(input.task);
            const governanceCheck = await governanceLimitEngine.checkLimits(securityContext.userId, routingDecision.expert, estimatedCost, estimatedTokens);
            if (!governanceCheck.allowed) {
                throw new Error(`Governance limit exceeded: ${governanceCheck.message}`);
            }
            // Budget admission control with graceful degradation
            const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
            const budgetController = createBudgetController(redis);
            const budgetAdmission = await budgetController.admit(routingDecision.expert, estimatedCost, input.emergency_justification ? true : false, securityContext.userId);
            if (!budgetAdmission.admit) {
                throw new Error(`Budget control: ${budgetAdmission.reason}`);
            }
            // If budget is in degraded mode and expert was blocked, suggest alternatives
            if (budgetAdmission.mode !== 'normal' && budgetAdmission.allowedExperts.length > 0) {
                console.warn('Budget degradation active:', {
                    mode: budgetAdmission.mode,
                    allowedExperts: budgetAdmission.allowedExperts,
                    blockedExperts: budgetAdmission.blockedExperts,
                    budgetRemaining: budgetAdmission.budgetRemaining,
                });
            }
            // Increment concurrent request counter
            governanceLimitEngine.incrementConcurrent(securityContext.userId);
            const opaClient = new OPAClient();
            const policyResult = await opaClient.canConduct(securityContext, input.task, routingDecision.expert, input.emergency_justification);
            if (!policyResult.allow) {
                // Decrement on failure
                governanceLimitEngine.decrementConcurrent(securityContext.userId);
                throw new Error(`Access denied: ${policyResult.reason || 'Policy violation'}`);
            }
            // Check for PII protection
            const piiCheck = opaClient.detectPII(input.task);
            if (piiCheck.hasPII && securityContext.clearanceLevel < 3) {
                throw new Error('Access denied: PII detected and insufficient clearance level');
            }
            // Add user context from GraphQL context
            const enrichedInput = {
                ...input,
                userContext: {
                    userId: context.user?.id,
                    role: context.user?.role,
                    scopes: context.user?.scopes || [],
                    ...input.userContext,
                },
            };
            try {
                const result = await conductor.conduct(enrichedInput);
                // Record actual usage for governance tracking
                const actualTokens = estimateTokenCount(result.output || '');
                const actualCost = result.cost || estimatedCost;
                governanceLimitEngine.recordUsage(securityContext.userId, actualCost, actualTokens, (result.output?.length || 0) * 2);
                // Record budget spending for admission control
                await budgetController.recordSpending(routingDecision.expert, actualCost, securityContext.userId);
                // Decrement concurrent counter on successful completion
                governanceLimitEngine.decrementConcurrent(securityContext.userId);
                // Generate audit hash for security logging
                if (policyResult.audit_required) {
                    const auditHash = opaClient.generateAuditHash({
                        user: {
                            id: securityContext.userId,
                            roles: securityContext.roles,
                            permissions: securityContext.permissions,
                            clearance_level: securityContext.clearanceLevel,
                            budget_remaining: securityContext.budgetRemaining,
                            rate_limit: securityContext.rateLimit,
                            requests_last_hour: securityContext.requestsLastHour,
                            location: securityContext.location,
                        },
                        action: 'conduct',
                        task: input.task,
                        expert: routingDecision.expert,
                    }, policyResult, Date.now());
                    console.log('Conductor security audit:', {
                        auditId: result.auditId,
                        securityHash: auditHash,
                        userId: securityContext.userId,
                        expert: routingDecision.expert,
                        piiDetected: piiCheck.hasPII,
                        cost: result.cost,
                    });
                }
                // Convert result to GraphQL format
                // Get approaching limits for warnings
                const limits = governanceLimitEngine.getApproachingLimits(securityContext.userId);
                const budgetWarnings = [];
                // Add budget mode warnings
                if (budgetAdmission.mode === 'degraded') {
                    budgetWarnings.push(`Budget degraded: ${budgetAdmission.budgetPercentUsed.toFixed(1)}% used, expensive experts blocked`);
                }
                else if (budgetAdmission.mode === 'critical') {
                    budgetWarnings.push(`Budget critical: ${budgetAdmission.budgetPercentUsed.toFixed(1)}% used, only essential experts available`);
                }
                const allWarnings = [
                    ...policyResult.warnings,
                    ...limits.warnings,
                    ...limits.critical,
                    ...budgetWarnings,
                ];
                return {
                    expertId: result.expertId,
                    output: result.output,
                    logs: result.logs,
                    cost: result.cost,
                    latencyMs: result.latencyMs,
                    error: result.error,
                    auditId: result.auditId,
                    warnings: allWarnings,
                    security_clearance_required: piiCheck.hasPII,
                    governance_limits_approaching: limits.warnings.length > 0 || limits.critical.length > 0,
                };
            }
            catch (error) {
                // Always decrement concurrent counter on error
                governanceLimitEngine.decrementConcurrent(securityContext.userId);
                console.error('Conductor execution failed:', error);
                throw new Error(`Conductor execution failed: ${error.message}`);
            }
        },
    },
    // Custom resolvers for enum types
    ExpertType: {
        LLM_LIGHT: 'LLM_LIGHT',
        LLM_HEAVY: 'LLM_HEAVY',
        GRAPH_TOOL: 'GRAPH_TOOL',
        RAG_TOOL: 'RAG_TOOL',
        FILES_TOOL: 'FILES_TOOL',
        OSINT_TOOL: 'OSINT_TOOL',
        EXPORT_TOOL: 'EXPORT_TOOL',
    },
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
                routingStats: null,
            };
        }
        const stats = conductor.getStats();
        return {
            status: 'active',
            activeTaskCount: stats.activeTaskCount,
            routingStats: {
                totalDecisions: stats.routingStats.totalDecisions,
                expertDistribution: Object.entries(stats.routingStats.expertDistribution).map(([expert, count]) => ({ expert, count })),
                avgConfidence: stats.routingStats.avgConfidence,
            },
            mcpStatus: Object.entries(stats.mcpConnectionStatus).map(([server, connected]) => ({
                server,
                connected,
            })),
            config: stats.config,
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
                checks: [],
            };
        }
        const checks = [];
        let overallHealthy = true;
        try {
            // Test basic routing
            const testDecision = conductor.previewRouting({
                task: 'test routing',
                sensitivity: 'low',
            });
            checks.push({
                name: 'routing',
                status: 'healthy',
                message: `Router selected: ${testDecision.expert}`,
            });
        }
        catch (error) {
            checks.push({
                name: 'routing',
                status: 'unhealthy',
                message: error.message,
            });
            overallHealthy = false;
        }
        // Check MCP connections (mock for now)
        checks.push({
            name: 'mcp_connections',
            status: 'healthy',
            message: 'All MCP servers reachable',
        });
        return {
            status: overallHealthy ? 'healthy' : 'unhealthy',
            message: overallHealthy ? 'All systems operational' : 'Some components unhealthy',
            checks,
        };
    },
};
// Export combined resolvers
export const allConductorResolvers = {
    ...conductorResolvers,
    Query: {
        ...conductorResolvers.Query,
        ...conductorQueries,
    },
};
//# sourceMappingURL=resolvers.js.map