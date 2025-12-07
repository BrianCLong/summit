/**
 * Agentic Governance Framework
 *
 * Production-grade governance layer for AI agent orchestration.
 * Implements policy-as-code enforcement, audit logging, and progressive enforcement.
 *
 * Gap Analysis Reference: Gap 1 - Agentic Orchestration & Governance Framework
 */

import { EventEmitter } from 'events';
import pino from 'pino';
import crypto from 'crypto';

const logger = pino({ name: 'agent-governance' });

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AgentIdentity {
  agentId: string;
  agentType: 'claude' | 'jules' | 'codex' | 'copilot' | 'custom';
  purpose: string;
  owner: string;
  createdAt: Date;
  scopes: AgentScope[];
  constraints: AgentConstraint[];
}

export interface AgentScope {
  resource: string;
  actions: ('read' | 'write' | 'execute' | 'delete')[];
  conditions?: Record<string, any>;
}

export interface AgentConstraint {
  type: 'rate_limit' | 'spending_limit' | 'time_window' | 'approval_required' | 'data_classification';
  value: any;
  action: 'block' | 'warn' | 'log';
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  condition: (context: ExecutionContext) => boolean;
  action: 'allow' | 'deny' | 'require_approval' | 'log';
  enforcement: 'monitor' | 'soft' | 'full';
}

export interface ExecutionContext {
  agent: AgentIdentity;
  tool: string;
  action: string;
  parameters: Record<string, any>;
  timestamp: Date;
  correlationId: string;
  parentExecutionId?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  allowed: boolean;
  requiresApproval: boolean;
  violations: PolicyViolation[];
  auditId: string;
  executionId: string;
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: Record<string, any>;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  executionId: string;
  correlationId: string;
  tool: string;
  action: string;
  parameters: Record<string, any>;
  result: 'allowed' | 'denied' | 'pending_approval';
  violations: PolicyViolation[];
  duration?: number;
  outcome?: 'success' | 'failure';
  error?: string;
}

export type EnforcementPhase = 'monitor' | 'soft' | 'full';

// ============================================================================
// Policy Engine
// ============================================================================

export class PolicyEngine {
  private rules: Map<string, PolicyRule> = new Map();
  private enforcementPhase: EnforcementPhase = 'monitor';

  constructor() {
    this.loadDefaultPolicies();
  }

  /**
   * Load default security policies
   */
  private loadDefaultPolicies(): void {
    // Prevent destructive operations without approval
    this.addRule({
      id: 'destructive-ops',
      name: 'Destructive Operations Guard',
      description: 'Require approval for destructive operations',
      priority: 100,
      condition: (ctx) => {
        const destructiveActions = ['delete', 'drop', 'truncate', 'destroy', 'remove'];
        return destructiveActions.some(action =>
          ctx.action.toLowerCase().includes(action) ||
          ctx.tool.toLowerCase().includes(action)
        );
      },
      action: 'require_approval',
      enforcement: 'full',
    });

    // Block access to sensitive data classifications
    this.addRule({
      id: 'data-classification',
      name: 'Data Classification Guard',
      description: 'Block access to classified data without proper scope',
      priority: 90,
      condition: (ctx) => {
        const sensitivePatterns = ['secret', 'classified', 'topsecret', 'sci'];
        const hasAccess = ctx.agent.scopes.some(s =>
          s.resource.includes('classified') || s.resource === '*'
        );
        const requestsSensitive = sensitivePatterns.some(p =>
          JSON.stringify(ctx.parameters).toLowerCase().includes(p)
        );
        return requestsSensitive && !hasAccess;
      },
      action: 'deny',
      enforcement: 'full',
    });

    // Rate limiting
    this.addRule({
      id: 'rate-limit',
      name: 'Rate Limit Guard',
      description: 'Enforce rate limits on agent operations',
      priority: 80,
      condition: (ctx) => {
        const rateLimitConstraint = ctx.agent.constraints.find(
          c => c.type === 'rate_limit'
        );
        // This would check against actual rate tracking in production
        return false; // Placeholder - actual implementation needs rate tracker
      },
      action: 'deny',
      enforcement: 'soft',
    });

    // Spending limits
    this.addRule({
      id: 'spending-limit',
      name: 'Spending Limit Guard',
      description: 'Enforce spending limits on costly operations',
      priority: 70,
      condition: (ctx) => {
        const costlyTools = ['llm', 'api', 'external'];
        const spendingConstraint = ctx.agent.constraints.find(
          c => c.type === 'spending_limit'
        );
        if (!spendingConstraint) return false;

        const isCostlyOp = costlyTools.some(t =>
          ctx.tool.toLowerCase().includes(t)
        );
        // This would check against actual spending tracking in production
        return false; // Placeholder
      },
      action: 'deny',
      enforcement: 'soft',
    });

    // Approval-required operations
    this.addRule({
      id: 'approval-required',
      name: 'Approval Required Operations',
      description: 'Operations that always require human approval',
      priority: 95,
      condition: (ctx) => {
        const approvalRequired = ctx.agent.constraints.some(
          c => c.type === 'approval_required' && c.value === true
        );
        const sensitiveOps = ['deploy', 'publish', 'release', 'commit', 'push'];
        return approvalRequired && sensitiveOps.some(op =>
          ctx.action.toLowerCase().includes(op)
        );
      },
      action: 'require_approval',
      enforcement: 'full',
    });

    logger.info({ ruleCount: this.rules.size }, 'Default policies loaded');
  }

  addRule(rule: PolicyRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  setEnforcementPhase(phase: EnforcementPhase): void {
    logger.info({ previousPhase: this.enforcementPhase, newPhase: phase }, 'Enforcement phase changed');
    this.enforcementPhase = phase;
  }

  /**
   * Evaluate all policies against execution context
   */
  evaluate(context: ExecutionContext): { allowed: boolean; requiresApproval: boolean; violations: PolicyViolation[] } {
    const violations: PolicyViolation[] = [];
    let requiresApproval = false;
    let denied = false;

    // Sort rules by priority (higher priority first)
    const sortedRules = Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      // Check if rule applies in current enforcement phase
      if (!this.shouldEnforceRule(rule)) {
        continue;
      }

      try {
        if (rule.condition(context)) {
          const violation: PolicyViolation = {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: this.getSeverity(rule),
            message: rule.description,
            context: {
              tool: context.tool,
              action: context.action,
              agentId: context.agent.agentId,
            },
          };
          violations.push(violation);

          // Apply enforcement based on phase
          if (this.enforcementPhase === 'full' ||
              (this.enforcementPhase === 'soft' && rule.action === 'deny')) {
            if (rule.action === 'deny') {
              denied = true;
            } else if (rule.action === 'require_approval') {
              requiresApproval = true;
            }
          }
        }
      } catch (error) {
        logger.error({ error, ruleId: rule.id }, 'Policy evaluation error');
      }
    }

    return {
      allowed: !denied,
      requiresApproval,
      violations,
    };
  }

  private shouldEnforceRule(rule: PolicyRule): boolean {
    if (this.enforcementPhase === 'full') return true;
    if (this.enforcementPhase === 'soft') return rule.enforcement !== 'monitor';
    return rule.enforcement === 'monitor';
  }

  private getSeverity(rule: PolicyRule): 'low' | 'medium' | 'high' | 'critical' {
    if (rule.priority >= 90) return 'critical';
    if (rule.priority >= 70) return 'high';
    if (rule.priority >= 50) return 'medium';
    return 'low';
  }
}

// ============================================================================
// Audit Logger
// ============================================================================

export class GovernanceAuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries = 10000;

  /**
   * Log an execution attempt
   */
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): string {
    const id = crypto.randomUUID();
    const fullEntry: AuditEntry = {
      ...entry,
      id,
      timestamp: new Date(),
    };

    this.entries.push(fullEntry);

    // Trim old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Log to structured logger
    logger.info({
      auditId: id,
      agentId: entry.agentId,
      tool: entry.tool,
      action: entry.action,
      result: entry.result,
      violations: entry.violations.length,
    }, 'Agent governance audit');

    return id;
  }

  /**
   * Update execution outcome
   */
  updateOutcome(auditId: string, outcome: 'success' | 'failure', duration: number, error?: string): void {
    const entry = this.entries.find(e => e.id === auditId);
    if (entry) {
      entry.outcome = outcome;
      entry.duration = duration;
      entry.error = error;
    }
  }

  /**
   * Query audit logs
   */
  query(filter: {
    agentId?: string;
    tool?: string;
    result?: AuditEntry['result'];
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): AuditEntry[] {
    let filtered = this.entries;

    if (filter.agentId) {
      filtered = filtered.filter(e => e.agentId === filter.agentId);
    }
    if (filter.tool) {
      filtered = filtered.filter(e => e.tool === filter.tool);
    }
    if (filter.result) {
      filtered = filtered.filter(e => e.result === filter.result);
    }
    if (filter.fromDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.fromDate!);
    }
    if (filter.toDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.toDate!);
    }

    // Return most recent first
    filtered = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Get audit statistics
   */
  getStats(): {
    total: number;
    allowed: number;
    denied: number;
    pendingApproval: number;
    violationsByRule: Record<string, number>;
  } {
    const stats = {
      total: this.entries.length,
      allowed: 0,
      denied: 0,
      pendingApproval: 0,
      violationsByRule: {} as Record<string, number>,
    };

    for (const entry of this.entries) {
      if (entry.result === 'allowed') stats.allowed++;
      else if (entry.result === 'denied') stats.denied++;
      else if (entry.result === 'pending_approval') stats.pendingApproval++;

      for (const violation of entry.violations) {
        stats.violationsByRule[violation.ruleId] =
          (stats.violationsByRule[violation.ruleId] || 0) + 1;
      }
    }

    return stats;
  }
}

// ============================================================================
// Agent Registry
// ============================================================================

export class AgentRegistry {
  private agents: Map<string, AgentIdentity> = new Map();

  /**
   * Register a new agent
   */
  register(agent: Omit<AgentIdentity, 'agentId' | 'createdAt'>): AgentIdentity {
    const agentId = `agent-${crypto.randomUUID()}`;
    const fullAgent: AgentIdentity = {
      ...agent,
      agentId,
      createdAt: new Date(),
    };

    this.agents.set(agentId, fullAgent);
    logger.info({ agentId, agentType: agent.agentType, purpose: agent.purpose }, 'Agent registered');

    return fullAgent;
  }

  /**
   * Get agent by ID
   */
  get(agentId: string): AgentIdentity | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Update agent constraints
   */
  updateConstraints(agentId: string, constraints: AgentConstraint[]): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.constraints = constraints;
    return true;
  }

  /**
   * Update agent scopes
   */
  updateScopes(agentId: string, scopes: AgentScope[]): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.scopes = scopes;
    return true;
  }

  /**
   * Revoke agent
   */
  revoke(agentId: string): boolean {
    const deleted = this.agents.delete(agentId);
    if (deleted) {
      logger.info({ agentId }, 'Agent revoked');
    }
    return deleted;
  }

  /**
   * List all agents
   */
  list(): AgentIdentity[] {
    return Array.from(this.agents.values());
  }
}

// ============================================================================
// Governance Controller (Main Entry Point)
// ============================================================================

export class GovernanceController extends EventEmitter {
  private policyEngine: PolicyEngine;
  private auditLogger: GovernanceAuditLogger;
  private agentRegistry: AgentRegistry;
  private pendingApprovals: Map<string, { context: ExecutionContext; resolve: (approved: boolean) => void }> = new Map();

  constructor() {
    super();
    this.policyEngine = new PolicyEngine();
    this.auditLogger = new GovernanceAuditLogger();
    this.agentRegistry = new AgentRegistry();
  }

  /**
   * Execute an agent action with governance checks
   */
  async executeWithGovernance<T>(
    agentId: string,
    tool: string,
    action: string,
    parameters: Record<string, any>,
    executor: () => Promise<T>,
    options?: { correlationId?: string; parentExecutionId?: string }
  ): Promise<T> {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const executionId = crypto.randomUUID();
    const correlationId = options?.correlationId || crypto.randomUUID();

    const context: ExecutionContext = {
      agent,
      tool,
      action,
      parameters,
      timestamp: new Date(),
      correlationId,
      parentExecutionId: options?.parentExecutionId,
    };

    // Evaluate policies
    const evaluation = this.policyEngine.evaluate(context);

    // Log the attempt
    const auditId = this.auditLogger.log({
      agentId,
      executionId,
      correlationId,
      tool,
      action,
      parameters,
      result: evaluation.allowed
        ? (evaluation.requiresApproval ? 'pending_approval' : 'allowed')
        : 'denied',
      violations: evaluation.violations,
    });

    // Emit events
    if (evaluation.violations.length > 0) {
      this.emit('violations', { executionId, violations: evaluation.violations });
    }

    // Check if denied
    if (!evaluation.allowed) {
      const error = new Error(`Agent action denied by governance policy`);
      (error as any).violations = evaluation.violations;
      (error as any).executionId = executionId;
      this.emit('denied', { executionId, context, violations: evaluation.violations });
      throw error;
    }

    // Check if requires approval
    if (evaluation.requiresApproval) {
      this.emit('approval_required', { executionId, context, violations: evaluation.violations });

      const approved = await this.waitForApproval(executionId, context);
      if (!approved) {
        const error = new Error(`Agent action not approved`);
        (error as any).executionId = executionId;
        throw error;
      }
    }

    // Execute the action
    const startTime = Date.now();
    try {
      const result = await executor();
      const duration = Date.now() - startTime;

      this.auditLogger.updateOutcome(auditId, 'success', duration);
      this.emit('success', { executionId, duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.auditLogger.updateOutcome(auditId, 'failure', duration, (error as Error).message);
      this.emit('failure', { executionId, error, duration });
      throw error;
    }
  }

  /**
   * Wait for human approval
   */
  private waitForApproval(executionId: string, context: ExecutionContext): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingApprovals.set(executionId, { context, resolve });

      // Auto-deny after 5 minutes
      setTimeout(() => {
        if (this.pendingApprovals.has(executionId)) {
          this.pendingApprovals.delete(executionId);
          resolve(false);
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Approve a pending execution
   */
  approve(executionId: string): boolean {
    const pending = this.pendingApprovals.get(executionId);
    if (pending) {
      pending.resolve(true);
      this.pendingApprovals.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Deny a pending execution
   */
  deny(executionId: string): boolean {
    const pending = this.pendingApprovals.get(executionId);
    if (pending) {
      pending.resolve(false);
      this.pendingApprovals.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): Array<{ executionId: string; context: ExecutionContext }> {
    return Array.from(this.pendingApprovals.entries()).map(([executionId, { context }]) => ({
      executionId,
      context,
    }));
  }

  // Expose sub-components
  get policies(): PolicyEngine {
    return this.policyEngine;
  }

  get audit(): GovernanceAuditLogger {
    return this.auditLogger;
  }

  get agents(): AgentRegistry {
    return this.agentRegistry;
  }
}

// Singleton instance
let governanceController: GovernanceController | null = null;

export function getGovernanceController(): GovernanceController {
  if (!governanceController) {
    governanceController = new GovernanceController();
  }
  return governanceController;
}

export default GovernanceController;
