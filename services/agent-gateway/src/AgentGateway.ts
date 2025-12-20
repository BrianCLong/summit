/**
 * Agent Gateway Service
 * AGENT-2: Gateway Foundation - All agent requests flow through here
 * AGENT-5: Operation Mode enforcement
 * AGENT-6: CLI & Orchestrator integration
 */

import { randomUUID } from 'crypto';
import type {
  Agent,
  AgentRequest,
  AgentResponse,
  AgentRun,
  AgentAction,
  OperationMode,
  RiskLevel,
  ActionType,
  GatewayConfig,
  TriggerType,
  PolicyDecision,
} from './types.js';
import { OPERATION_MODES } from './types.js';
import { AgentService } from './AgentService.js';
import { PolicyEnforcer } from './PolicyEnforcer.js';
import { QuotaManager } from './QuotaManager.js';
import { ApprovalService } from './ApprovalService.js';
import { ObservabilityService } from './ObservabilityService.js';

export class AgentGateway {
  constructor(
    private db: any,
    private agentService: AgentService,
    private policyEnforcer: PolicyEnforcer,
    private quotaManager: QuotaManager,
    private approvalService: ApprovalService,
    private observability: ObservabilityService,
    private config: GatewayConfig
  ) {}

  /**
   * Execute an agent request
   * This is the main entry point for all agent operations
   */
  async executeRequest<T = unknown>(
    request: AgentRequest,
    authToken: string
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();
    let agent: Agent | null = null;
    let run: AgentRun | null = null;
    let action: AgentAction | null = null;

    try {
      // =====================================================================
      // AGENT-1d: Authenticate the agent
      // =====================================================================
      agent = await this.agentService.authenticateAgent(authToken);
      if (!agent) {
        throw new Error('Authentication failed: Invalid credentials');
      }

      // Check agent status
      if (agent.status !== 'active') {
        throw new Error(`Agent is not active. Status: ${agent.status}`);
      }

      // =====================================================================
      // AGENT-4: Validate tenant/project scoping
      // =====================================================================
      this.validateScopes(agent, request.tenantId, request.projectId);

      // =====================================================================
      // AGENT-5: Determine operation mode
      // =====================================================================
      const operationMode = this.determineOperationMode(agent, request);

      // =====================================================================
      // AGENT-8: Check quotas
      // =====================================================================
      await this.quotaManager.checkQuotas(agent.id);

      // =====================================================================
      // Create agent run
      // =====================================================================
      run = await this.createRun(agent, request, operationMode);

      // =====================================================================
      // AGENT-7: Observability - Start tracing
      // =====================================================================
      const { traceId, spanId } = await this.observability.startTrace(agent, run);
      run.traceId = traceId;
      run.spanId = spanId;

      // =====================================================================
      // Assess risk and create action
      // =====================================================================
      const riskAssessment = this.assessRisk(request.action, agent, request.tenantId);
      action = await this.createAction(run, request.action, riskAssessment);

      // =====================================================================
      // AGENT-3: Policy enforcement
      // =====================================================================
      const policyDecision = await this.policyEnforcer.evaluate({
        agent,
        action,
        tenantId: request.tenantId,
        projectId: request.projectId,
        operationMode,
      });

      action.policyDecision = policyDecision;

      // Handle policy decision
      if (!policyDecision.allowed) {
        action.authorizationStatus = 'denied';
        action.denialReason = policyDecision.reason;
        await this.updateAction(action);

        return this.buildResponse(run, action, operationMode, {
          success: false,
          error: {
            code: 'POLICY_DENIED',
            message: policyDecision.reason,
          },
        });
      }

      // =====================================================================
      // AGENT-9: Check if approval required
      // =====================================================================
      if (this.requiresApproval(action, operationMode)) {
        action.requiresApproval = true;
        action.authorizationStatus = 'requires_approval';

        const approval = await this.approvalService.createApproval({
          agentId: agent.id,
          runId: run.id,
          actionId: action.id,
          summary: `${agent.name} requests to ${request.action.type} ${request.action.target || 'resource'}`,
          details: {
            action: request.action,
            riskLevel: action.riskLevel,
            riskFactors: action.riskFactors,
          },
          riskLevel: action.riskLevel,
          assignedTo: this.config.defaultApprovalAssignees,
          expiresInMinutes: this.config.defaultApprovalExpiryMinutes,
        });

        action.approvalId = approval.id;
        await this.updateAction(action);

        return this.buildResponse(run, action, operationMode, {
          success: false,
          approval: {
            id: approval.id,
            status: 'pending',
            expiresAt: approval.expiresAt,
          },
        });
      }

      // =====================================================================
      // AGENT-5: Execute based on operation mode
      // =====================================================================
      let result: T | undefined;

      if (operationMode === 'SIMULATION') {
        // SIMULATION: Don't execute, just return what would happen
        result = {
          message: `Would execute ${request.action.type} on ${request.action.target || 'resource'}`,
          wouldPerform: request.action,
          estimatedImpact: riskAssessment.riskFactors.map(f => f.description),
        } as T;

        action.executed = false;
        action.authorizationStatus = 'allowed';
      } else if (operationMode === 'DRY_RUN') {
        // DRY_RUN: Limited execution (planning, validation, etc.)
        result = await this.executeDryRun(request, agent);
        action.executed = false;
        action.authorizationStatus = 'allowed';
      } else {
        // ENFORCED: Real execution
        result = await this.executeEnforced(request, agent);
        action.executed = true;
        action.executedAt = new Date();
        action.authorizationStatus = 'allowed';
      }

      action.executionResult = result as Record<string, unknown>;
      await this.updateAction(action);

      // =====================================================================
      // Update run and quotas
      // =====================================================================
      run.status = 'completed';
      run.completedAt = new Date();
      run.durationMs = Date.now() - startTime;
      run.actionsExecuted = [action];
      await this.updateRun(run);

      await this.quotaManager.recordUsage(agent.id, run);

      // =====================================================================
      // AGENT-7: Complete tracing
      // =====================================================================
      await this.observability.endTrace(traceId, spanId, { status: 'success' });

      return this.buildResponse(run, action, operationMode, {
        success: true,
        result,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';

      // Update run if created
      if (run) {
        run.status = 'failed';
        run.completedAt = new Date();
        run.durationMs = Date.now() - startTime;
        run.error = {
          code: error.code || 'EXECUTION_ERROR',
          message: errorMessage,
          stack: error.stack,
        };
        await this.updateRun(run);
      }

      // Update action if created
      if (action) {
        action.executionError = errorMessage;
        await this.updateAction(action);
      }

      // End trace
      if (run?.traceId && run?.spanId) {
        await this.observability.endTrace(run.traceId, run.spanId, {
          status: 'error',
          error: errorMessage,
        });
      }

      return this.buildResponse(
        run,
        action,
        request.operationMode || this.config.defaultOperationMode,
        {
          success: false,
          error: {
            code: error.code || 'EXECUTION_ERROR',
            message: errorMessage,
            details: error.details,
          },
        }
      );
    }
  }

  /**
   * AGENT-4: Validate that agent has access to requested tenant/project
   */
  private validateScopes(agent: Agent, tenantId: string, projectId?: string): void {
    // Check tenant scope
    if (agent.tenantScopes.length > 0 && !agent.tenantScopes.includes(tenantId)) {
      throw {
        code: 'SCOPE_VIOLATION',
        message: `Agent ${agent.name} does not have access to tenant ${tenantId}`,
        details: { agentId: agent.id, tenantId, allowedTenants: agent.tenantScopes },
      };
    }

    // Check project scope if specified
    if (projectId && agent.projectScopes.length > 0 && !agent.projectScopes.includes(projectId)) {
      throw {
        code: 'SCOPE_VIOLATION',
        message: `Agent ${agent.name} does not have access to project ${projectId}`,
        details: { agentId: agent.id, projectId, allowedProjects: agent.projectScopes },
      };
    }
  }

  /**
   * AGENT-5: Determine operation mode for this request
   */
  private determineOperationMode(agent: Agent, request: AgentRequest): OperationMode {
    // Config can force SIMULATION mode
    if (this.config.forceSimulationMode) {
      return 'SIMULATION';
    }

    // Request can override if allowed
    if (request.operationMode && this.config.allowModeOverride) {
      return request.operationMode;
    }

    // Otherwise use default
    return this.config.defaultOperationMode;
  }

  /**
   * Assess risk level of an action
   */
  private assessRisk(
    action: { type: ActionType; target?: string; payload?: Record<string, unknown> },
    agent: Agent,
    tenantId: string
  ): { riskLevel: RiskLevel; riskFactors: Array<{ factor: string; severity: RiskLevel; description: string }> } {
    const riskFactors: Array<{ factor: string; severity: RiskLevel; description: string }> = [];

    // High-risk action types
    const highRiskActions: ActionType[] = ['delete', 'config:modify', 'user:impersonate'];
    const criticalRiskActions: ActionType[] = ['user:impersonate'];

    if (criticalRiskActions.includes(action.type)) {
      riskFactors.push({
        factor: 'critical_action_type',
        severity: 'critical',
        description: `Action type ${action.type} is classified as critical risk`,
      });
    } else if (highRiskActions.includes(action.type)) {
      riskFactors.push({
        factor: 'high_risk_action_type',
        severity: 'high',
        description: `Action type ${action.type} is classified as high risk`,
      });
    }

    // Check if agent is certified
    if (!agent.isCertified) {
      riskFactors.push({
        factor: 'uncertified_agent',
        severity: 'medium',
        description: 'Agent has not been certified',
      });
    }

    // Check if certification expired
    if (agent.isCertified && agent.certificationExpiresAt && agent.certificationExpiresAt < new Date()) {
      riskFactors.push({
        factor: 'expired_certification',
        severity: 'high',
        description: 'Agent certification has expired',
      });
    }

    // Determine overall risk level
    let riskLevel: RiskLevel = 'low';
    if (riskFactors.some(f => f.severity === 'critical')) {
      riskLevel = 'critical';
    } else if (riskFactors.some(f => f.severity === 'high')) {
      riskLevel = 'high';
    } else if (riskFactors.some(f => f.severity === 'medium')) {
      riskLevel = 'medium';
    }

    return { riskLevel, riskFactors };
  }

  /**
   * AGENT-9: Check if action requires approval
   */
  private requiresApproval(action: AgentAction, operationMode: OperationMode): boolean {
    // SIMULATION and DRY_RUN don't require approval
    if (operationMode !== 'ENFORCED') {
      return false;
    }

    // Check config
    if (action.riskLevel === 'critical' || action.riskLevel === 'high') {
      return true;
    }

    return false;
  }

  /**
   * Execute in DRY_RUN mode (planning, validation, etc.)
   */
  private async executeDryRun<T>(request: AgentRequest, agent: Agent): Promise<T> {
    // For DRY_RUN, we can do planning, validation, etc.
    // But no actual data modifications
    return {
      message: 'Dry run completed',
      action: request.action,
      validationPassed: true,
      estimatedDuration: '~1s',
    } as T;
  }

  /**
   * AGENT-6: Execute in ENFORCED mode (real execution)
   */
  private async executeEnforced<T>(request: AgentRequest, agent: Agent): Promise<T> {
    // Route to appropriate handler based on action type
    switch (request.action.type) {
      case 'read':
        return this.executeRead(request) as Promise<T>;
      case 'write':
        return this.executeWrite(request) as Promise<T>;
      case 'pipeline:trigger':
        return this.executePipelineTrigger(request) as Promise<T>;
      case 'execute':
        return this.executeCLICommand(request) as Promise<T>;
      default:
        throw new Error(`Unsupported action type: ${request.action.type}`);
    }
  }

  /**
   * AGENT-6: Execute CLI command (wrapper for summit CLI)
   */
  private async executeCLICommand(request: AgentRequest): Promise<any> {
    // This would integrate with the actual Summit CLI
    // For now, return a placeholder
    return {
      message: 'CLI command executed',
      command: request.action.payload?.command,
      result: 'success',
    };
  }

  /**
   * AGENT-6: Trigger pipeline (wrapper for orchestrator)
   */
  private async executePipelineTrigger(request: AgentRequest): Promise<any> {
    // This would integrate with the pipeline orchestrator
    // For now, return a placeholder
    return {
      message: 'Pipeline triggered',
      pipelineId: request.action.target,
      runId: randomUUID(),
      status: 'running',
    };
  }

  /**
   * Execute read operation
   */
  private async executeRead(request: AgentRequest): Promise<any> {
    // Implement read logic
    return {
      message: 'Read operation completed',
      target: request.action.target,
      data: {},
    };
  }

  /**
   * Execute write operation
   */
  private async executeWrite(request: AgentRequest): Promise<any> {
    // Implement write logic
    return {
      message: 'Write operation completed',
      target: request.action.target,
      data: request.action.payload,
    };
  }

  // =========================================================================
  // Database operations
  // =========================================================================

  private async createRun(agent: Agent, request: AgentRequest, operationMode: OperationMode): Promise<AgentRun> {
    const result = await this.db.query(
      `INSERT INTO agent_runs (
        agent_id, tenant_id, project_id, operation_mode,
        trigger_type, trigger_source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        agent.id,
        request.tenantId,
        request.projectId,
        operationMode,
        'api',
        JSON.stringify(request.metadata || {}),
        'running',
      ]
    );

    return this.mapRowToRun(result.rows[0]);
  }

  private async updateRun(run: AgentRun): Promise<void> {
    await this.db.query(
      `UPDATE agent_runs
       SET status = $1, completed_at = $2, duration_ms = $3,
           actions_proposed = $4, actions_executed = $5, actions_denied = $6,
           outcome = $7, error = $8, trace_id = $9, span_id = $10
       WHERE id = $11`,
      [
        run.status,
        run.completedAt,
        run.durationMs,
        JSON.stringify(run.actionsProposed || []),
        JSON.stringify(run.actionsExecuted || []),
        JSON.stringify(run.actionsDenied || []),
        JSON.stringify(run.outcome || {}),
        run.error ? JSON.stringify(run.error) : null,
        run.traceId,
        run.spanId,
        run.id,
      ]
    );
  }

  private async createAction(
    run: AgentRun,
    actionRequest: { type: ActionType; target?: string; payload?: Record<string, unknown> },
    riskAssessment: { riskLevel: RiskLevel; riskFactors: any[] }
  ): Promise<AgentAction> {
    const result = await this.db.query(
      `INSERT INTO agent_actions (
        run_id, agent_id, action_type, action_target, action_payload,
        risk_level, risk_factors, authorization_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        run.id,
        run.agentId,
        actionRequest.type,
        actionRequest.target,
        JSON.stringify(actionRequest.payload || {}),
        riskAssessment.riskLevel,
        JSON.stringify(riskAssessment.riskFactors),
        'pending',
      ]
    );

    return this.mapRowToAction(result.rows[0]);
  }

  private async updateAction(action: AgentAction): Promise<void> {
    await this.db.query(
      `UPDATE agent_actions
       SET authorization_status = $1, denial_reason = $2, requires_approval = $3,
           approval_id = $4, executed = $5, execution_result = $6,
           execution_error = $7, executed_at = $8, policy_decision = $9
       WHERE id = $10`,
      [
        action.authorizationStatus,
        action.denialReason,
        action.requiresApproval,
        action.approvalId,
        action.executed,
        action.executionResult ? JSON.stringify(action.executionResult) : null,
        action.executionError,
        action.executedAt,
        action.policyDecision ? JSON.stringify(action.policyDecision) : null,
        action.id,
      ]
    );
  }

  private buildResponse<T>(
    run: AgentRun | null,
    action: AgentAction | null,
    operationMode: OperationMode,
    data: {
      success: boolean;
      result?: T;
      error?: { code: string; message: string; details?: Record<string, unknown> };
      approval?: { id: string; status: string; expiresAt: Date };
    }
  ): AgentResponse<T> {
    return {
      success: data.success,
      runId: run?.id || 'unknown',
      operationMode,
      action: {
        id: action?.id || 'unknown',
        type: action?.actionType || 'unknown',
        authorizationStatus: action?.authorizationStatus || 'denied',
        executed: action?.executed || false,
      },
      result: data.result,
      error: data.error,
      approval: data.approval,
    };
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapRowToRun(row: any): AgentRun {
    return {
      id: row.id,
      agentId: row.agent_id,
      tenantId: row.tenant_id,
      projectId: row.project_id,
      operationMode: row.operation_mode,
      triggerType: row.trigger_type,
      triggerSource: JSON.parse(row.trigger_source || '{}'),
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      actionsProposed: JSON.parse(row.actions_proposed || '[]'),
      actionsExecuted: JSON.parse(row.actions_executed || '[]'),
      actionsDenied: JSON.parse(row.actions_denied || '[]'),
      outcome: JSON.parse(row.outcome || '{}'),
      error: row.error ? JSON.parse(row.error) : undefined,
      traceId: row.trace_id,
      spanId: row.span_id,
      durationMs: row.duration_ms,
      tokensConsumed: row.tokens_consumed,
      apiCallsMade: row.api_calls_made || 0,
      createdAt: row.created_at,
    };
  }

  private mapRowToAction(row: any): AgentAction {
    return {
      id: row.id,
      runId: row.run_id,
      agentId: row.agent_id,
      actionType: row.action_type,
      actionTarget: row.action_target,
      actionPayload: JSON.parse(row.action_payload || '{}'),
      riskLevel: row.risk_level,
      riskFactors: JSON.parse(row.risk_factors || '[]'),
      policyDecision: row.policy_decision ? JSON.parse(row.policy_decision) : undefined,
      authorizationStatus: row.authorization_status,
      denialReason: row.denial_reason,
      requiresApproval: row.requires_approval || false,
      approvalId: row.approval_id,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      executed: row.executed || false,
      executionResult: row.execution_result ? JSON.parse(row.execution_result) : undefined,
      executionError: row.execution_error,
      executedAt: row.executed_at,
      createdAt: row.created_at,
    };
  }
}
