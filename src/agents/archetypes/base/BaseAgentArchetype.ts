/**
 * BaseAgentArchetype - Abstract base class for all agent archetypes
 *
 * Provides core functionality for graph operations, policy evaluation,
 * audit logging, and integration with Summit's infrastructure.
 */

import {
  AgentRole,
  AgentContext,
  AgentQuery,
  AgentAnalysis,
  AgentRecommendation,
  AgentAction,
  AgentResult,
  AgentStatusInfo,
  AgentMetrics,
  AgentHealth,
  PolicyResult,
  AuditRecord,
  GraphEntity,
} from './types';

export abstract class BaseAgentArchetype {
  protected instanceId: string;
  protected metrics: AgentMetrics;
  protected lastActivity: Date;

  constructor(
    public readonly name: string,
    public readonly role: AgentRole,
    public readonly capabilities: string[],
  ) {
    this.instanceId = `${role}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.metrics = this.initializeMetrics();
    this.lastActivity = new Date();
  }

  /**
   * Initialize the agent (setup connections, load config, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Execute agent with given context
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Analyze a query and return findings/insights
   */
  abstract analyze(query: AgentQuery, context: AgentContext): Promise<AgentAnalysis>;

  /**
   * Generate recommendations based on analysis
   */
  abstract recommend(analysis: AgentAnalysis, context: AgentContext): Promise<AgentRecommendation[]>;

  /**
   * Execute a recommended action
   */
  abstract act(recommendation: AgentRecommendation, context: AgentContext): Promise<AgentAction>;

  /**
   * Shutdown the agent gracefully
   */
  abstract shutdown(): Promise<void>;

  /**
   * Get graph entities relevant to this agent
   */
  protected async getGraphEntities(context: AgentContext, type: string, filters?: Record<string, any>): Promise<GraphEntity[]> {
    const { organization } = context;
    const { graphHandle } = organization;

    let cypher = `MATCH (n:${type})`;
    const params: Record<string, any> = {};

    if (filters) {
      const conditions: string[] = [];
      Object.entries(filters).forEach(([key, value], index) => {
        const paramName = `param${index}`;
        conditions.push(`n.${key} = $${paramName}`);
        params[paramName] = value;
      });

      if (conditions.length > 0) {
        cypher += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    cypher += ' RETURN n';

    try {
      const results = await graphHandle.query(cypher, params);
      return results.map((row) => row.n as GraphEntity);
    } catch (error) {
      console.error(`[${this.role}] Failed to query graph entities:`, error);
      throw error;
    }
  }

  /**
   * Create a graph entity
   */
  protected async createGraphEntity(
    context: AgentContext,
    type: string,
    properties: Record<string, any>,
  ): Promise<GraphEntity> {
    const { organization } = context;
    const { graphHandle } = organization;

    try {
      return await graphHandle.createEntity(type, properties);
    } catch (error) {
      console.error(`[${this.role}] Failed to create graph entity:`, error);
      throw error;
    }
  }

  /**
   * Update a graph entity
   */
  protected async updateGraphEntity(
    context: AgentContext,
    id: string,
    properties: Record<string, any>,
  ): Promise<GraphEntity> {
    const { organization } = context;
    const { graphHandle } = organization;

    try {
      return await graphHandle.updateEntity(id, properties);
    } catch (error) {
      console.error(`[${this.role}] Failed to update graph entity:`, error);
      throw error;
    }
  }

  /**
   * Evaluate policy for an action
   */
  protected async evaluatePolicy(action: AgentAction, context: AgentContext): Promise<PolicyResult> {
    const { organization, user } = context;

    // Build OPA input
    const opaInput = {
      agent: {
        role: this.role,
        instanceId: this.instanceId,
      },
      action: action.actionType,
      resource: action.parameters,
      user: {
        id: user.id,
        roles: user.roles,
        permissions: user.permissions,
      },
      organization: {
        id: organization.id,
        policies: organization.policies,
      },
    };

    try {
      // Call OPA policy engine (would integrate with actual OPA service)
      // For now, return a mock result
      const allowed = await this.callOPAPolicyEngine(opaInput);

      return {
        allowed,
        policy: `agents.archetypes.${this.role}.${action.actionType}`,
        reason: allowed ? undefined : 'Policy denied action',
      };
    } catch (error) {
      console.error(`[${this.role}] Policy evaluation failed:`, error);
      return {
        allowed: false,
        policy: 'error',
        reason: `Policy evaluation error: ${error.message}`,
      };
    }
  }

  /**
   * Call OPA policy engine (stub for integration)
   */
  private async callOPAPolicyEngine(input: any): Promise<boolean> {
    // TODO: Integrate with actual OPA service
    // For now, return true for read-only actions, false for write actions
    const readOnlyActions = ['read', 'analyze', 'query', 'list', 'get'];
    const actionType = input.action.toLowerCase();

    return readOnlyActions.some((action) => actionType.includes(action));
  }

  /**
   * Create audit log entry
   */
  protected async createAuditLog(action: AgentAction, context: AgentContext): Promise<AuditRecord> {
    const { requestId, user, organization, classification } = context;

    const auditRecord: AuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      requestId,
      agentType: this.role,
      agentInstanceId: this.instanceId,
      action: action.actionType,
      input: action.parameters,
      output: action.result,
      policyResult: action.policyResult,
      approvalRequired: action.approvalRequired,
      approvalStatus: action.approvalStatus,
      userId: user.id,
      organizationId: organization.id,
      classification,
    };

    try {
      // TODO: Integrate with actual audit log service
      // For now, just log to console
      console.log(`[AUDIT] ${JSON.stringify(auditRecord, null, 2)}`);

      return auditRecord;
    } catch (error) {
      console.error(`[${this.role}] Failed to create audit log:`, error);
      throw error;
    }
  }

  /**
   * Get current status
   */
  public getStatus(): AgentStatusInfo {
    return {
      status: 'ready',
      lastActive: this.lastActivity,
      queuedTasks: 0,
      metadata: {
        instanceId: this.instanceId,
        role: this.role,
        capabilities: this.capabilities,
      },
    };
  }

  /**
   * Get metrics
   */
  public getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health check
   */
  public async getHealthCheck(): Promise<AgentHealth> {
    return {
      healthy: true,
      checks: {
        graphConnection: true, // TODO: Actual health check
        policyEngine: true,
        approvalEngine: true,
        auditLog: true,
      },
      lastCheck: new Date(),
    };
  }

  /**
   * Update metrics
   */
  protected updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update response time (simple moving average)
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;

    // Update p95/p99 (simplified - in production would use histogram)
    if (responseTime > this.metrics.p95ResponseTime) {
      this.metrics.p95ResponseTime = responseTime;
    }
    if (responseTime > this.metrics.p99ResponseTime) {
      this.metrics.p99ResponseTime = responseTime;
    }

    this.lastActivity = new Date();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): AgentMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      actionsExecuted: 0,
      approvalsRequired: 0,
      policyViolations: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }
}
