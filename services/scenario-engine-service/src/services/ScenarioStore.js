"use strict";
/**
 * Scenario Store
 *
 * Manages scenario persistence and lifecycle:
 * - CRUD operations for scenarios
 * - Scenario versioning and branching
 * - Cleanup of expired scenarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioStore = void 0;
const index_js_1 = require("../types/index.js");
const SandboxGraph_js_1 = require("./SandboxGraph.js");
const WhatIfOperations_js_1 = require("./WhatIfOperations.js");
const ScenarioAnalytics_js_1 = require("./ScenarioAnalytics.js");
const DEFAULT_CONFIG = {
    maxScenariosPerTenant: 100,
    defaultRetentionDays: 30,
    enableAutoCleanup: true,
    cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
};
class ScenarioStore {
    scenarios = new Map();
    contexts = new Map();
    tenantScenarios = new Map();
    sourceProvider;
    config;
    cleanupInterval;
    constructor(sourceProvider, config = {}) {
        this.sourceProvider = sourceProvider;
        this.config = { ...DEFAULT_CONFIG, ...config };
        if (this.config.enableAutoCleanup) {
            this.startCleanupJob();
        }
    }
    // ============================================================================
    // Scenario CRUD
    // ============================================================================
    /**
     * Create a new scenario
     */
    async createScenario(params) {
        const { name, description, mode = 'sandbox', scenarioParams, tenantId, createdBy, assumptions = [], tags = [], } = params;
        // Check tenant limit
        const tenantScenarioIds = this.tenantScenarios.get(tenantId) || new Set();
        if (tenantScenarioIds.size >= this.config.maxScenariosPerTenant) {
            throw new index_js_1.ProductionDataGuardError(`Tenant ${tenantId} has reached maximum scenario limit (${this.config.maxScenariosPerTenant})`);
        }
        const now = Date.now();
        const scenarioId = (0, index_js_1.generateId)();
        // Create policy labels with non-production guardrails
        const policy = {
            environment: 'non-production',
            tenantId,
            caseId: scenarioParams.sourceCaseId,
            classification: 'sandbox',
            retentionDays: this.config.defaultRetentionDays,
            createdBy,
            accessControl: [createdBy],
        };
        // Create sandbox graph
        const sandboxGraph = new SandboxGraph_js_1.SandboxGraph(scenarioId, this.sourceProvider, {
            maxNodes: scenarioParams.maxNodes,
            maxEdges: scenarioParams.maxEdges,
        });
        // Initialize from source if specified
        if (scenarioParams.sourceNodeIds && scenarioParams.sourceNodeIds.length > 0) {
            await sandboxGraph.createFromNodes(scenarioParams.sourceNodeIds, {
                includeNeighbors: scenarioParams.includeNeighbors,
                neighborDepth: scenarioParams.neighborDepth,
                edgeTypes: scenarioParams.edgeTypes,
            });
        }
        // Create scenario record
        const scenario = {
            id: scenarioId,
            name,
            description,
            mode,
            status: 'draft',
            params: scenarioParams,
            policy,
            graphId: sandboxGraph.getGraphId(),
            deltaSets: [],
            assumptions,
            tags,
            version: 1,
            childScenarioIds: [],
            createdAt: now,
            updatedAt: now,
            expiresAt: (0, index_js_1.calculateRetentionExpiry)(policy.retentionDays),
        };
        // Create context with all services
        const whatIfOps = new WhatIfOperations_js_1.WhatIfOperations(sandboxGraph);
        const analytics = new ScenarioAnalytics_js_1.ScenarioAnalytics(sandboxGraph);
        const context = {
            scenario,
            sandboxGraph,
            whatIfOps,
            analytics,
        };
        // Store
        this.scenarios.set(scenarioId, scenario);
        this.contexts.set(scenarioId, context);
        if (!this.tenantScenarios.has(tenantId)) {
            this.tenantScenarios.set(tenantId, new Set());
        }
        this.tenantScenarios.get(tenantId).add(scenarioId);
        return context;
    }
    /**
     * Get a scenario by ID
     */
    getScenario(scenarioId) {
        const scenario = this.scenarios.get(scenarioId);
        if (scenario && (0, index_js_1.isScenarioExpired)(scenario)) {
            this.deleteScenario(scenarioId);
            return undefined;
        }
        return scenario;
    }
    /**
     * Get scenario context (includes all services)
     */
    getContext(scenarioId) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario)
            return undefined;
        return this.contexts.get(scenarioId);
    }
    /**
     * Update scenario metadata
     */
    updateScenario(scenarioId, updates) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario)
            return undefined;
        Object.assign(scenario, updates, { updatedAt: Date.now() });
        return scenario;
    }
    /**
     * Delete a scenario
     */
    deleteScenario(scenarioId) {
        const scenario = this.scenarios.get(scenarioId);
        if (!scenario)
            return false;
        // Remove from tenant tracking
        const tenantScenarios = this.tenantScenarios.get(scenario.policy.tenantId);
        if (tenantScenarios) {
            tenantScenarios.delete(scenarioId);
        }
        // Clean up context
        this.contexts.delete(scenarioId);
        this.scenarios.delete(scenarioId);
        return true;
    }
    /**
     * List scenarios for a tenant
     */
    listScenarios(tenantId, options) {
        const scenarioIds = this.tenantScenarios.get(tenantId) || new Set();
        let scenarios = [];
        for (const id of scenarioIds) {
            const scenario = this.getScenario(id);
            if (scenario) {
                scenarios.push(scenario);
            }
        }
        // Apply filters
        if (options?.status) {
            scenarios = scenarios.filter(s => s.status === options.status);
        }
        if (options?.mode) {
            scenarios = scenarios.filter(s => s.mode === options.mode);
        }
        if (options?.tags && options.tags.length > 0) {
            scenarios = scenarios.filter(s => options.tags.some(tag => s.tags.includes(tag)));
        }
        // Sort by updated time (newest first)
        scenarios.sort((a, b) => b.updatedAt - a.updatedAt);
        // Apply pagination
        const offset = options?.offset || 0;
        const limit = options?.limit || 50;
        return scenarios.slice(offset, offset + limit);
    }
    // ============================================================================
    // Scenario Versioning & Branching
    // ============================================================================
    /**
     * Create a branch (child scenario) from an existing scenario
     */
    async branchScenario(parentScenarioId, params) {
        const parentContext = this.getContext(parentScenarioId);
        if (!parentContext) {
            throw new index_js_1.ScenarioNotFoundError(parentScenarioId);
        }
        const { scenario: parent, sandboxGraph: parentGraph } = parentContext;
        const now = Date.now();
        const childId = (0, index_js_1.generateId)();
        // Clone the sandbox graph
        const childGraph = parentGraph.clone(childId);
        // Create child scenario
        const childScenario = {
            id: childId,
            name: params.name,
            description: params.description,
            mode: parent.mode,
            status: 'draft',
            params: { ...parent.params },
            policy: {
                ...parent.policy,
                createdBy: params.createdBy,
                accessControl: [...parent.policy.accessControl, params.createdBy],
            },
            graphId: childGraph.getGraphId(),
            deltaSets: [],
            baselineMetrics: parent.currentMetrics,
            assumptions: [...parent.assumptions],
            tags: [...parent.tags],
            version: 1,
            parentScenarioId,
            childScenarioIds: [],
            createdAt: now,
            updatedAt: now,
            expiresAt: (0, index_js_1.calculateRetentionExpiry)(parent.policy.retentionDays),
        };
        // Create context
        const whatIfOps = new WhatIfOperations_js_1.WhatIfOperations(childGraph);
        const analytics = new ScenarioAnalytics_js_1.ScenarioAnalytics(childGraph);
        const context = {
            scenario: childScenario,
            sandboxGraph: childGraph,
            whatIfOps,
            analytics,
        };
        // Store
        this.scenarios.set(childId, childScenario);
        this.contexts.set(childId, context);
        // Update parent
        parent.childScenarioIds.push(childId);
        // Track under tenant
        const tenantScenarios = this.tenantScenarios.get(parent.policy.tenantId);
        if (tenantScenarios) {
            tenantScenarios.add(childId);
        }
        return context;
    }
    /**
     * Snapshot a scenario (freeze current state)
     */
    async snapshotScenario(scenarioId) {
        const context = this.getContext(scenarioId);
        if (!context) {
            throw new index_js_1.ScenarioNotFoundError(scenarioId);
        }
        const { scenario, analytics } = context;
        // Compute and store current metrics
        const metrics = await analytics.computeMetrics(scenario.baselineMetrics);
        scenario.currentMetrics = metrics;
        scenario.computedAt = Date.now();
        scenario.updatedAt = Date.now();
        scenario.version++;
        return scenario;
    }
    /**
     * Activate a scenario (mark as ready for analysis)
     */
    activateScenario(scenarioId) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario) {
            throw new index_js_1.ScenarioNotFoundError(scenarioId);
        }
        scenario.status = 'active';
        scenario.updatedAt = Date.now();
        return scenario;
    }
    /**
     * Archive a scenario
     */
    archiveScenario(scenarioId) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario) {
            throw new index_js_1.ScenarioNotFoundError(scenarioId);
        }
        scenario.status = 'archived';
        scenario.updatedAt = Date.now();
        return scenario;
    }
    // ============================================================================
    // Delta Management
    // ============================================================================
    /**
     * Add a delta set to scenario history
     */
    addDeltaSet(scenarioId, deltaSet) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario) {
            throw new index_js_1.ScenarioNotFoundError(scenarioId);
        }
        scenario.deltaSets.push(deltaSet);
        scenario.currentDeltaSetId = deltaSet.id;
        scenario.updatedAt = Date.now();
    }
    /**
     * Get delta history for a scenario
     */
    getDeltaHistory(scenarioId) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario) {
            throw new index_js_1.ScenarioNotFoundError(scenarioId);
        }
        return scenario.deltaSets;
    }
    // ============================================================================
    // Metrics Management
    // ============================================================================
    /**
     * Update metrics for a scenario
     */
    updateMetrics(scenarioId, metrics) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario) {
            throw new index_js_1.ScenarioNotFoundError(scenarioId);
        }
        scenario.currentMetrics = metrics;
        scenario.computedAt = metrics.computedAt;
        scenario.updatedAt = Date.now();
    }
    /**
     * Set baseline metrics for comparison
     */
    setBaselineMetrics(scenarioId, metrics) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario) {
            throw new index_js_1.ScenarioNotFoundError(scenarioId);
        }
        scenario.baselineMetrics = metrics;
        scenario.updatedAt = Date.now();
    }
    // ============================================================================
    // Cleanup
    // ============================================================================
    /**
     * Start automatic cleanup job
     */
    startCleanupJob() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredScenarios();
        }, this.config.cleanupIntervalMs);
    }
    /**
     * Stop cleanup job
     */
    stopCleanupJob() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    /**
     * Remove all expired scenarios
     */
    cleanupExpiredScenarios() {
        let cleanedCount = 0;
        for (const [id, scenario] of this.scenarios) {
            if ((0, index_js_1.isScenarioExpired)(scenario)) {
                this.deleteScenario(id);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    /**
     * Get store statistics
     */
    getStats() {
        const byStatus = {};
        const byMode = {};
        const byTenant = {};
        for (const scenario of this.scenarios.values()) {
            byStatus[scenario.status] = (byStatus[scenario.status] || 0) + 1;
            byMode[scenario.mode] = (byMode[scenario.mode] || 0) + 1;
            byTenant[scenario.policy.tenantId] = (byTenant[scenario.policy.tenantId] || 0) + 1;
        }
        return {
            totalScenarios: this.scenarios.size,
            byStatus,
            byMode,
            byTenant,
        };
    }
    /**
     * Clear all scenarios (for testing)
     */
    clear() {
        this.scenarios.clear();
        this.contexts.clear();
        this.tenantScenarios.clear();
    }
    /**
     * Shutdown store
     */
    shutdown() {
        this.stopCleanupJob();
        this.clear();
    }
}
exports.ScenarioStore = ScenarioStore;
