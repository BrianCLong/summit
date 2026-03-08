"use strict";
/**
 * Routing Gateway Service
 *
 * Routes tasks to appropriate agents and model calls to appropriate providers
 * based on task type, risk tier, budget constraints, and latency SLOs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRoutingConfig = exports.RoutingError = exports.RoutingEngine = void 0;
exports.createRoutingGateway = createRoutingGateway;
// ============================================================================
// ROUTING ENGINE
// ============================================================================
class RoutingEngine {
    config;
    agentRegistry = new Map();
    providerHealth = new Map();
    constructor(config) {
        this.config = config;
        this.initializeProviderHealth();
    }
    /**
     * Route a task to an appropriate agent.
     */
    async routeTask(context) {
        const strategy = context.strategy ?? this.config.defaultStrategy;
        const startTime = Date.now();
        // Get matching agents
        const candidates = this.findCandidateAgents(context);
        if (candidates.length === 0) {
            throw new RoutingError('NO_AGENTS_AVAILABLE', 'No agents available for this task type');
        }
        // Score and rank candidates
        const scoredCandidates = this.scoreCandidates(candidates, context, strategy);
        // Select best agent
        const selected = scoredCandidates[0];
        // Determine model preference
        const modelPreference = await this.selectModel(context, selected.agent);
        return {
            selectedAgent: selected.agent.id,
            selectedModel: modelPreference,
            strategy,
            confidence: selected.score,
            alternatives: scoredCandidates.slice(1, 4).map((c) => ({
                agentId: c.agent.id,
                model: c.agent.modelPreference ?? modelPreference,
                reason: c.reason,
            })),
            decidedAt: new Date().toISOString(),
        };
    }
    /**
     * Route a model call to an appropriate provider.
     */
    async routeModelCall(taskType, riskTier, budget, latencySlo) {
        // Filter healthy providers
        const healthyProviders = this.getHealthyProviders();
        if (healthyProviders.length === 0) {
            throw new RoutingError('NO_PROVIDERS_AVAILABLE', 'All model providers are unhealthy');
        }
        // Find matching model based on constraints
        let bestModel = null;
        let bestScore = -Infinity;
        for (const providerConfig of healthyProviders) {
            for (const model of providerConfig.models) {
                const score = this.scoreModel(model, providerConfig, {
                    taskType,
                    riskTier,
                    budget,
                    latencySlo,
                });
                if (score > bestScore) {
                    bestScore = score;
                    bestModel = { provider: providerConfig.name, model };
                }
            }
        }
        if (!bestModel) {
            // Fallback to default
            return {
                provider: this.config.fallbackProvider,
                model: 'default',
            };
        }
        return {
            provider: bestModel.provider,
            model: bestModel.model.name,
            maxTokens: budget?.maxTokens ?? bestModel.model.maxTokens,
        };
    }
    /**
     * Register an agent with the routing engine.
     */
    registerAgent(agent) {
        this.agentRegistry.set(agent.id, agent);
    }
    /**
     * Unregister an agent.
     */
    unregisterAgent(agentId) {
        this.agentRegistry.delete(agentId);
    }
    /**
     * Update provider health status.
     */
    updateProviderHealth(provider, status) {
        this.providerHealth.set(provider, status);
    }
    // ---------------------------------------------------------------------------
    // PRIVATE METHODS
    // ---------------------------------------------------------------------------
    findCandidateAgents(context) {
        const taskType = context.task.type;
        return Array.from(this.agentRegistry.values()).filter((agent) => {
            // Agent must be active
            if (agent.status !== 'active')
                return false;
            // Agent must have relevant capabilities
            const hasCapability = agent.capabilities.some((cap) => taskType.includes(cap) || cap.includes(taskType.split('_')[0]));
            return hasCapability;
        });
    }
    scoreCandidates(candidates, context, strategy) {
        return candidates
            .map((agent) => {
            let score = 50; // Base score
            let reason = 'Default candidate';
            // Strategy-specific scoring
            switch (strategy) {
                case 'cheapest_meeting_slo':
                    if (agent.costProfile) {
                        score += 100 - agent.costProfile.inputTokenCost * 1000;
                    }
                    if (context.latencySlo && agent.expectedLatencyMs) {
                        if (agent.expectedLatencyMs <= context.latencySlo.targetP95Ms) {
                            score += 20;
                        }
                        else {
                            score -= 50; // Penalty for not meeting SLO
                        }
                    }
                    reason = 'Optimized for cost while meeting SLO';
                    break;
                case 'max_quality':
                    // Prefer lower risk tiers (more reliable)
                    if (agent.riskTier === 'low')
                        score += 30;
                    if (agent.riskTier === 'medium')
                        score += 15;
                    reason = 'Optimized for quality';
                    break;
                case 'fastest':
                    if (agent.expectedLatencyMs) {
                        score += 100 - agent.expectedLatencyMs / 100;
                    }
                    reason = 'Optimized for speed';
                    break;
                case 'defensive_multi_model':
                    // Prefer agents that support critic loops
                    if (agent.capabilities.includes('self_review'))
                        score += 25;
                    reason = 'Defensive multi-model strategy';
                    break;
            }
            // Adjust for previous failures
            const failedAttempts = context.previousAttempts?.filter((a) => a.agentId === agent.id && a.result === 'failure').length ?? 0;
            score -= failedAttempts * 30;
            return { agent, score, reason };
        })
            .sort((a, b) => b.score - a.score);
    }
    async selectModel(context, agent) {
        // Use agent's preference if specified and provider is healthy
        if (agent.modelPreference) {
            const health = this.providerHealth.get(agent.modelPreference.provider);
            if (health?.healthy) {
                return agent.modelPreference;
            }
        }
        // Otherwise route based on task
        return this.routeModelCall(context.task.type, agent.riskTier, context.budget, context.latencySlo);
    }
    scoreModel(model, provider, constraints) {
        let score = provider.priority * 10;
        // Cost scoring
        if (constraints.budget?.maxCostUsd) {
            const estimatedCost = (model.inputCostPer1k + model.outputCostPer1k) * 2; // Rough estimate
            if (estimatedCost <= constraints.budget.maxCostUsd) {
                score += 20;
            }
            else {
                return -1; // Disqualify
            }
        }
        // Latency scoring
        if (constraints.latencySlo) {
            if (model.latencyP95Ms <= constraints.latencySlo.targetP95Ms) {
                score += 30;
            }
            else {
                score -= 20;
            }
        }
        // Capability matching
        if (model.capabilities.some((c) => constraints.taskType.includes(c))) {
            score += 25;
        }
        return score;
    }
    getHealthyProviders() {
        return this.config.providers.filter((p) => {
            const health = this.providerHealth.get(p.name);
            return health?.healthy ?? true; // Assume healthy if unknown
        });
    }
    initializeProviderHealth() {
        for (const provider of this.config.providers) {
            this.providerHealth.set(provider.name, {
                healthy: true,
                lastCheck: new Date().toISOString(),
                latencyMs: 0,
                errorRate: 0,
            });
        }
    }
}
exports.RoutingEngine = RoutingEngine;
class RoutingError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'RoutingError';
    }
}
exports.RoutingError = RoutingError;
function createRoutingGateway(config) {
    const engine = new RoutingEngine(config);
    return {
        async start(port) {
            // In production, this would start an Express/Fastify server
            console.log(`Routing Gateway starting on port ${port}`);
            // Example endpoints:
            // POST /api/v1/route/task - Route a task
            // POST /api/v1/route/model - Route a model call
            // POST /api/v1/agents - Register an agent
            // DELETE /api/v1/agents/:id - Unregister an agent
            // GET /api/v1/health - Health check
        },
        async stop() {
            console.log('Routing Gateway stopping');
        },
    };
}
// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
exports.defaultRoutingConfig = {
    defaultStrategy: 'cheapest_meeting_slo',
    fallbackProvider: 'anthropic',
    strategies: [
        {
            name: 'cheapest_meeting_slo',
            rules: [
                {
                    condition: { riskTier: ['low', 'medium'] },
                    action: { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
                    priority: 1,
                },
            ],
        },
    ],
    providers: [
        {
            name: 'anthropic',
            models: [
                {
                    name: 'claude-sonnet-4-5-20250929',
                    inputCostPer1k: 0.003,
                    outputCostPer1k: 0.015,
                    maxTokens: 8192,
                    latencyP95Ms: 3000,
                    capabilities: ['code', 'analysis', 'planning'],
                },
            ],
            rateLimitPerMinute: 1000,
            priority: 1,
        },
        {
            name: 'openai',
            models: [
                {
                    name: 'gpt-4-turbo',
                    inputCostPer1k: 0.01,
                    outputCostPer1k: 0.03,
                    maxTokens: 4096,
                    latencyP95Ms: 2000,
                    capabilities: ['code', 'analysis'],
                },
            ],
            rateLimitPerMinute: 500,
            priority: 2,
        },
    ],
};
