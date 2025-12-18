/**
 * Scenario Store
 *
 * Manages scenario persistence and lifecycle:
 * - CRUD operations for scenarios
 * - Scenario versioning and branching
 * - Cleanup of expired scenarios
 */

import {
  type Scenario,
  type ScenarioParams,
  type ScenarioPolicyLabels,
  type DeltaSet,
  type OutcomeMetrics,
  ScenarioStatus,
  ScenarioMode,
  generateId,
  calculateRetentionExpiry,
  isScenarioExpired,
  ScenarioNotFoundError,
  ProductionDataGuardError,
} from '../types/index.js';
import { SandboxGraph, type SourceGraphProvider } from './SandboxGraph.js';
import { WhatIfOperations } from './WhatIfOperations.js';
import { ScenarioAnalytics } from './ScenarioAnalytics.js';

export interface ScenarioStoreConfig {
  maxScenariosPerTenant: number;
  defaultRetentionDays: number;
  enableAutoCleanup: boolean;
  cleanupIntervalMs: number;
}

const DEFAULT_CONFIG: ScenarioStoreConfig = {
  maxScenariosPerTenant: 100,
  defaultRetentionDays: 30,
  enableAutoCleanup: true,
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
};

export interface ScenarioContext {
  scenario: Scenario;
  sandboxGraph: SandboxGraph;
  whatIfOps: WhatIfOperations;
  analytics: ScenarioAnalytics;
}

export class ScenarioStore {
  private scenarios: Map<string, Scenario> = new Map();
  private contexts: Map<string, ScenarioContext> = new Map();
  private tenantScenarios: Map<string, Set<string>> = new Map();
  private sourceProvider?: SourceGraphProvider;
  private config: ScenarioStoreConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    sourceProvider?: SourceGraphProvider,
    config: Partial<ScenarioStoreConfig> = {}
  ) {
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
  async createScenario(params: {
    name: string;
    description?: string;
    mode?: ScenarioMode;
    scenarioParams: ScenarioParams;
    tenantId: string;
    createdBy: string;
    assumptions?: string[];
    tags?: string[];
  }): Promise<ScenarioContext> {
    const {
      name,
      description,
      mode = 'sandbox',
      scenarioParams,
      tenantId,
      createdBy,
      assumptions = [],
      tags = [],
    } = params;

    // Check tenant limit
    const tenantScenarioIds = this.tenantScenarios.get(tenantId) || new Set();
    if (tenantScenarioIds.size >= this.config.maxScenariosPerTenant) {
      throw new ProductionDataGuardError(
        `Tenant ${tenantId} has reached maximum scenario limit (${this.config.maxScenariosPerTenant})`
      );
    }

    const now = Date.now();
    const scenarioId = generateId();

    // Create policy labels with non-production guardrails
    const policy: ScenarioPolicyLabels = {
      environment: 'non-production',
      tenantId,
      caseId: scenarioParams.sourceCaseId,
      classification: 'sandbox',
      retentionDays: this.config.defaultRetentionDays,
      createdBy,
      accessControl: [createdBy],
    };

    // Create sandbox graph
    const sandboxGraph = new SandboxGraph(scenarioId, this.sourceProvider, {
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
    const scenario: Scenario = {
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
      expiresAt: calculateRetentionExpiry(policy.retentionDays),
    };

    // Create context with all services
    const whatIfOps = new WhatIfOperations(sandboxGraph);
    const analytics = new ScenarioAnalytics(sandboxGraph);

    const context: ScenarioContext = {
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
    this.tenantScenarios.get(tenantId)!.add(scenarioId);

    return context;
  }

  /**
   * Get a scenario by ID
   */
  getScenario(scenarioId: string): Scenario | undefined {
    const scenario = this.scenarios.get(scenarioId);
    if (scenario && isScenarioExpired(scenario)) {
      this.deleteScenario(scenarioId);
      return undefined;
    }
    return scenario;
  }

  /**
   * Get scenario context (includes all services)
   */
  getContext(scenarioId: string): ScenarioContext | undefined {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) return undefined;
    return this.contexts.get(scenarioId);
  }

  /**
   * Update scenario metadata
   */
  updateScenario(
    scenarioId: string,
    updates: Partial<Pick<Scenario, 'name' | 'description' | 'assumptions' | 'tags' | 'notes' | 'status'>>
  ): Scenario | undefined {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) return undefined;

    Object.assign(scenario, updates, { updatedAt: Date.now() });
    return scenario;
  }

  /**
   * Delete a scenario
   */
  deleteScenario(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return false;

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
  listScenarios(tenantId: string, options?: {
    status?: ScenarioStatus;
    mode?: ScenarioMode;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Scenario[] {
    const scenarioIds = this.tenantScenarios.get(tenantId) || new Set();
    let scenarios: Scenario[] = [];

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
      scenarios = scenarios.filter(s =>
        options.tags!.some(tag => s.tags.includes(tag))
      );
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
  async branchScenario(
    parentScenarioId: string,
    params: {
      name: string;
      description?: string;
      createdBy: string;
    }
  ): Promise<ScenarioContext> {
    const parentContext = this.getContext(parentScenarioId);
    if (!parentContext) {
      throw new ScenarioNotFoundError(parentScenarioId);
    }

    const { scenario: parent, sandboxGraph: parentGraph } = parentContext;
    const now = Date.now();
    const childId = generateId();

    // Clone the sandbox graph
    const childGraph = parentGraph.clone(childId);

    // Create child scenario
    const childScenario: Scenario = {
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
      expiresAt: calculateRetentionExpiry(parent.policy.retentionDays),
    };

    // Create context
    const whatIfOps = new WhatIfOperations(childGraph);
    const analytics = new ScenarioAnalytics(childGraph);

    const context: ScenarioContext = {
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
  async snapshotScenario(scenarioId: string): Promise<Scenario> {
    const context = this.getContext(scenarioId);
    if (!context) {
      throw new ScenarioNotFoundError(scenarioId);
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
  activateScenario(scenarioId: string): Scenario {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new ScenarioNotFoundError(scenarioId);
    }

    scenario.status = 'active';
    scenario.updatedAt = Date.now();

    return scenario;
  }

  /**
   * Archive a scenario
   */
  archiveScenario(scenarioId: string): Scenario {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new ScenarioNotFoundError(scenarioId);
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
  addDeltaSet(scenarioId: string, deltaSet: DeltaSet): void {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new ScenarioNotFoundError(scenarioId);
    }

    scenario.deltaSets.push(deltaSet);
    scenario.currentDeltaSetId = deltaSet.id;
    scenario.updatedAt = Date.now();
  }

  /**
   * Get delta history for a scenario
   */
  getDeltaHistory(scenarioId: string): DeltaSet[] {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new ScenarioNotFoundError(scenarioId);
    }

    return scenario.deltaSets;
  }

  // ============================================================================
  // Metrics Management
  // ============================================================================

  /**
   * Update metrics for a scenario
   */
  updateMetrics(scenarioId: string, metrics: OutcomeMetrics): void {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new ScenarioNotFoundError(scenarioId);
    }

    scenario.currentMetrics = metrics;
    scenario.computedAt = metrics.computedAt;
    scenario.updatedAt = Date.now();
  }

  /**
   * Set baseline metrics for comparison
   */
  setBaselineMetrics(scenarioId: string, metrics: OutcomeMetrics): void {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new ScenarioNotFoundError(scenarioId);
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
  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredScenarios();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop cleanup job
   */
  stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Remove all expired scenarios
   */
  cleanupExpiredScenarios(): number {
    let cleanedCount = 0;

    for (const [id, scenario] of this.scenarios) {
      if (isScenarioExpired(scenario)) {
        this.deleteScenario(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalScenarios: number;
    byStatus: Record<string, number>;
    byMode: Record<string, number>;
    byTenant: Record<string, number>;
  } {
    const byStatus: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    const byTenant: Record<string, number> = {};

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
  clear(): void {
    this.scenarios.clear();
    this.contexts.clear();
    this.tenantScenarios.clear();
  }

  /**
   * Shutdown store
   */
  shutdown(): void {
    this.stopCleanupJob();
    this.clear();
  }
}
