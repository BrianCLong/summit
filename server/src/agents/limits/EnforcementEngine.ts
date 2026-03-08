/**
 * Centralized Agent Execution Enforcement Engine
 *
 * Hard enforcement of capabilities, limits, and budgets that cannot be bypassed by agent logic.
 * All agent runners MUST use this wrapper to ensure governance.
 *
 * Design Principle: Fail-closed. Deny by default, allow by explicit permission.
 */

import { randomUUID } from 'crypto';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database.js';

// ============================================================================
// Types
// ============================================================================

export interface AgentIdentity {
  id: string;
  name: string;
  version: string;
  agent_type: 'internal' | 'external' | 'partner';
  status: 'active' | 'suspended' | 'retired' | 'revoked';
  is_certified: boolean;
  certification_expires_at?: Date;
  owner_id: string;
  organization_id: string;
}

export interface CapabilityScope {
  tenant_scopes: string[];
  project_scopes?: string[];
  data_classifications?: string[];
  allowed_domains?: string[];
  allowed_apis?: string[];
  allowed_tools?: string[];
  read_only: boolean;
  secrets_access: boolean;
  cross_tenant: boolean;
}

export interface AgentCapability {
  name: string;
  scope: CapabilityScope;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  requires_approval: boolean;
  approval_class: 'auto' | 'gated' | 'human_in_the_loop';
}

export interface ExecutionLimits {
  max_wall_clock_ms: number;
  max_steps: number;
  max_tool_calls: number;
  max_tokens_total: number;
  max_memory_mb: number;
  max_concurrent_requests: number;
  max_runs_per_minute: number;
  max_runs_per_hour: number;
  max_runs_per_day: number;
}

export interface BudgetLimits {
  max_cost_per_run_usd: number;
  max_cost_per_day_usd: number;
  max_cost_per_month_usd: number;
  quota_type: string;
  quota_limit: number;
  on_limit_breach: 'deny' | 'throttle' | 'escalate' | 'alert';
}

export interface AgentRestrictions {
  allowed_operation_modes: string[];
  requires_human_oversight: boolean;
  max_trust_level: string;
  compliance_tags: string[];
}

export interface AgentRegistryEntry {
  identity: AgentIdentity;
  capabilities: AgentCapability[];
  limits: {
    execution: ExecutionLimits;
    budget: BudgetLimits;
  };
  restrictions: AgentRestrictions;
}

export interface EnforcementContext {
  agent_id: string;
  agent_version: string;
  tenant_id: string;
  project_id?: string;
  user_id?: string;
  operation_mode: 'SIMULATION' | 'DRY_RUN' | 'ENFORCED';
  requested_capability: string;
  action_type: string;
  action_target: string;
  action_payload?: unknown;
}

export interface EnforcementResult {
  allowed: boolean;
  decision: 'allow' | 'deny' | 'conditional';
  reason: string;
  obligations: Obligation[];
  policy_path?: string;
  requires_approval: boolean;
  approval_class?: string;
}

export interface Obligation {
  type: string;
  details: unknown;
}

export interface ExecutionState {
  run_id: string;
  agent_id: string;
  started_at: Date;
  steps_executed: number;
  tool_calls_made: number;
  tokens_consumed: number;
  cost_usd: number;
  memory_peak_mb: number;
  capabilities_used: Set<string>;
}

// ============================================================================
// Registry Loader
// ============================================================================

class RegistryLoader {
  private registry: Map<string, AgentRegistryEntry> = new Map();
  private revocations: {
    agents: Set<string>;
    capabilities: Map<string, { reason: string; applies_to: string[] }>;
  } = {
    agents: new Set(),
    capabilities: new Map(),
  };

  constructor(registryPath?: string) {
    this.loadRegistry(registryPath);
  }

  private loadRegistry(registryPath?: string): void {
    const defaultPath = path.join(process.cwd(), 'agents', 'registry.yaml');
    const filePath = registryPath || defaultPath;

    if (!fs.existsSync(filePath)) {
      console.warn(`Registry file not found at ${filePath}, using empty registry`);
      return;
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.parse(fileContents);

    // Load agents
    if (data.agents && Array.isArray(data.agents)) {
      for (const agentEntry of data.agents) {
        const key = `${agentEntry.identity.name}:${agentEntry.identity.version}`;
        this.registry.set(key, agentEntry as AgentRegistryEntry);
      }
    }

    // Load revocations
    if (data.revocations) {
      if (data.revocations.agents) {
        for (const rev of data.revocations.agents) {
          this.revocations.agents.add(rev.agent_id);
        }
      }
      if (data.revocations.capabilities) {
        for (const rev of data.revocations.capabilities) {
          this.revocations.capabilities.set(rev.capability, {
            reason: rev.reason,
            applies_to: rev.applies_to || ['*'],
          });
        }
      }
    }

    console.log(`Loaded ${this.registry.size} agents from registry`);
  }

  getAgent(name: string, version: string): AgentRegistryEntry | null {
    const key = `${name}:${version}`;
    return this.registry.get(key) || null;
  }

  isAgentRevoked(agentId: string): boolean {
    return this.revocations.agents.has(agentId);
  }

  isCapabilityRevoked(capability: string, agentId: string): boolean {
    const revocation = this.revocations.capabilities.get(capability);
    if (!revocation) return false;

    const appliesTo = revocation.applies_to;
    return appliesTo.includes('*') || appliesTo.includes(agentId);
  }

  revokeAgent(agentId: string, reason: string): void {
    this.revocations.agents.add(agentId);
    console.log(`Revoked agent ${agentId}: ${reason}`);
  }

  revokeCapability(capability: string, reason: string, appliesTo: string[] = ['*']): void {
    this.revocations.capabilities.set(capability, { reason, applies_to: appliesTo });
    console.log(`Revoked capability ${capability}: ${reason}`);
  }

  reinstateAgent(agentId: string): void {
    this.revocations.agents.delete(agentId);
    console.log(`Reinstated agent ${agentId}`);
  }

  reinstateCapability(capability: string): void {
    this.revocations.capabilities.delete(capability);
    console.log(`Reinstated capability ${capability}`);
  }
}

// ============================================================================
// Enforcement Engine
// ============================================================================

export class EnforcementEngine {
  private registry: RegistryLoader;
  private pool: Pool;
  private executionStates: Map<string, ExecutionState> = new Map();

  constructor(registryPath?: string) {
    this.registry = new RegistryLoader(registryPath);
    this.pool = getPostgresPool();
  }

  /**
   * Pre-execution enforcement: Check if agent can start a run
   */
  async checkCanExecute(context: EnforcementContext): Promise<EnforcementResult> {
    // 1. Load agent from registry
    const agent = this.registry.getAgent(context.agent_id, context.agent_version);
    if (!agent) {
      return {
        allowed: false,
        decision: 'deny',
        reason: `Agent ${context.agent_id}:${context.agent_version} not found in registry`,
        obligations: [],
        requires_approval: false,
      };
    }

    // 2. Check agent status
    if (agent.identity.status !== 'active') {
      return {
        allowed: false,
        decision: 'deny',
        reason: `Agent status is ${agent.identity.status}, must be active`,
        obligations: [],
        requires_approval: false,
      };
    }

    // 3. Check revocation
    if (this.registry.isAgentRevoked(agent.identity.id)) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Agent has been revoked',
        obligations: [],
        requires_approval: false,
      };
    }

    // 4. Check certification (if required for capability)
    const capability = this.findCapability(agent, context.requested_capability);
    if (capability && capability.risk_level === 'critical' && !agent.identity.is_certified) {
      return {
        allowed: false,
        decision: 'deny',
        reason: 'Critical capability requires certified agent',
        obligations: [],
        requires_approval: false,
      };
    }

    // 5. Check capability exists and not revoked
    if (!capability) {
      return {
        allowed: false,
        decision: 'deny',
        reason: `Agent does not have capability: ${context.requested_capability}`,
        obligations: [],
        requires_approval: false,
      };
    }

    if (this.registry.isCapabilityRevoked(context.requested_capability, agent.identity.id)) {
      return {
        allowed: false,
        decision: 'deny',
        reason: `Capability ${context.requested_capability} has been revoked`,
        obligations: [],
        requires_approval: false,
      };
    }

    // 6. Check operation mode allowed
    if (!agent.restrictions.allowed_operation_modes.includes(context.operation_mode)) {
      return {
        allowed: false,
        decision: 'deny',
        reason: `Operation mode ${context.operation_mode} not allowed for this agent`,
        obligations: [],
        requires_approval: false,
      };
    }

    // 7. Check scope boundaries
    const scopeCheck = this.checkScope(capability.scope, context);
    if (!scopeCheck.allowed) {
      return {
        allowed: false,
        decision: 'deny',
        reason: scopeCheck.reason || 'Scope violation',
        obligations: [],
        requires_approval: false,
      };
    }

    // 8. Check rate limits
    const rateLimitCheck = await this.checkRateLimits(agent, context);
    if (!rateLimitCheck.allowed) {
      return {
        allowed: false,
        decision: 'deny',
        reason: rateLimitCheck.reason || 'Rate limit exceeded',
        obligations: [],
        requires_approval: false,
      };
    }

    // 9. Check quotas
    const quotaCheck = await this.checkQuotas(agent, context);
    if (!quotaCheck.allowed) {
      return {
        allowed: false,
        decision: 'deny',
        reason: quotaCheck.reason || 'Quota exceeded',
        obligations: [],
        requires_approval: false,
      };
    }

    // 10. Determine approval requirements
    const requiresApproval = capability.requires_approval || capability.risk_level === 'critical';
    const obligations: Obligation[] = [];

    if (requiresApproval) {
      obligations.push({
        type: 'require_approval',
        details: {
          approval_class: capability.approval_class,
          risk_level: capability.risk_level,
        },
      });
    }

    if (capability.risk_level === 'high' || capability.risk_level === 'critical') {
      obligations.push({
        type: 'audit_enhanced',
        details: { risk_level: capability.risk_level },
      });
    }

    // 11. If SIMULATION mode, always allow
    if (context.operation_mode === 'SIMULATION') {
      return {
        allowed: true,
        decision: 'allow',
        reason: 'SIMULATION mode - no real execution',
        obligations,
        requires_approval: false, // No approval needed in simulation
      };
    }

    // 12. If DRY_RUN mode, check but don't execute
    if (context.operation_mode === 'DRY_RUN') {
      return {
        allowed: true,
        decision: 'conditional',
        reason: 'DRY_RUN mode - would execute with obligations',
        obligations,
        requires_approval: requiresApproval,
        approval_class: capability.approval_class,
      };
    }

    // 13. ENFORCED mode - full enforcement
    return {
      allowed: true,
      decision: requiresApproval ? 'conditional' : 'allow',
      reason: 'Execution allowed with enforcement',
      obligations,
      requires_approval: requiresApproval,
      approval_class: capability.approval_class,
    };
  }

  /**
   * Initialize execution tracking
   */
  startExecution(agentId: string): string {
    const runId = randomUUID();
    const state: ExecutionState = {
      run_id: runId,
      agent_id: agentId,
      started_at: new Date(),
      steps_executed: 0,
      tool_calls_made: 0,
      tokens_consumed: 0,
      cost_usd: 0,
      memory_peak_mb: 0,
      capabilities_used: new Set(),
    };
    this.executionStates.set(runId, state);
    return runId;
  }

  /**
   * Runtime limit enforcement during execution
   */
  checkRuntimeLimits(runId: string, agent: AgentRegistryEntry): { allowed: boolean; reason?: string } {
    const state = this.executionStates.get(runId);
    if (!state) {
      return { allowed: false, reason: 'Execution state not found' };
    }

    const limits = agent.limits.execution;
    const elapsed = Date.now() - state.started_at.getTime();

    // Wall clock timeout
    if (elapsed > limits.max_wall_clock_ms) {
      return { allowed: false, reason: `Wall clock timeout exceeded: ${elapsed}ms > ${limits.max_wall_clock_ms}ms` };
    }

    // Step limit
    if (state.steps_executed >= limits.max_steps) {
      return { allowed: false, reason: `Step limit exceeded: ${state.steps_executed} >= ${limits.max_steps}` };
    }

    // Tool call limit
    if (state.tool_calls_made >= limits.max_tool_calls) {
      return { allowed: false, reason: `Tool call limit exceeded: ${state.tool_calls_made} >= ${limits.max_tool_calls}` };
    }

    // Token limit
    if (state.tokens_consumed >= limits.max_tokens_total) {
      return { allowed: false, reason: `Token limit exceeded: ${state.tokens_consumed} >= ${limits.max_tokens_total}` };
    }

    // Budget limit
    if (state.cost_usd >= agent.limits.budget.max_cost_per_run_usd) {
      return { allowed: false, reason: `Run cost limit exceeded: $${state.cost_usd} >= $${agent.limits.budget.max_cost_per_run_usd}` };
    }

    // Memory limit
    if (state.memory_peak_mb >= limits.max_memory_mb) {
      return { allowed: false, reason: `Memory limit exceeded: ${state.memory_peak_mb}MB >= ${limits.max_memory_mb}MB` };
    }

    return { allowed: true };
  }

  /**
   * Update execution metrics
   */
  updateMetrics(runId: string, metrics: {
    steps?: number;
    tool_calls?: number;
    tokens?: number;
    cost?: number;
    memory?: number;
    capability_used?: string;
  }): void {
    const state = this.executionStates.get(runId);
    if (!state) return;

    if (metrics.steps) state.steps_executed += metrics.steps;
    if (metrics.tool_calls) state.tool_calls_made += metrics.tool_calls;
    if (metrics.tokens) state.tokens_consumed += metrics.tokens;
    if (metrics.cost) state.cost_usd += metrics.cost;
    if (metrics.memory && metrics.memory > state.memory_peak_mb) {
      state.memory_peak_mb = metrics.memory;
    }
    if (metrics.capability_used) {
      state.capabilities_used.add(metrics.capability_used);
    }
  }

  /**
   * Complete execution and cleanup
   */
  completeExecution(runId: string): ExecutionState | null {
    const state = this.executionStates.get(runId);
    if (!state) return null;

    this.executionStates.delete(runId);
    return state;
  }

  /**
   * Abort in-flight execution
   */
  abortExecution(runId: string, reason: string): void {
    const state = this.executionStates.get(runId);
    if (state) {
      console.log(`Aborting execution ${runId}: ${reason}`);
      this.executionStates.delete(runId);
    }
  }

  /**
   * Revoke agent immediately
   */
  revokeAgent(agentId: string, reason: string): void {
    this.registry.revokeAgent(agentId, reason);

    // Abort all in-flight runs for this agent
    for (const [runId, state] of this.executionStates.entries()) {
      if (state.agent_id === agentId) {
        this.abortExecution(runId, `Agent revoked: ${reason}`);
      }
    }
  }

  /**
   * Revoke capability globally or for specific agents
   */
  revokeCapability(capability: string, reason: string, appliesTo: string[] = ['*']): void {
    this.registry.revokeCapability(capability, reason, appliesTo);

    // Abort in-flight runs using this capability
    for (const [runId, state] of this.executionStates.entries()) {
      if (state.capabilities_used.has(capability)) {
        const shouldAbort = appliesTo.includes('*') || appliesTo.includes(state.agent_id);
        if (shouldAbort) {
          this.abortExecution(runId, `Capability revoked: ${reason}`);
        }
      }
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private findCapability(agent: AgentRegistryEntry, capabilityName: string): AgentCapability | null {
    return agent.capabilities.find(c => c.name === capabilityName) || null;
  }

  private checkScope(scope: CapabilityScope, context: EnforcementContext): { allowed: boolean; reason?: string } {
    // Check tenant scope
    if (!scope.tenant_scopes.includes('*') && !scope.tenant_scopes.includes(context.tenant_id)) {
      return { allowed: false, reason: 'Tenant not in scope' };
    }

    // Check project scope
    if (context.project_id && scope.project_scopes) {
      const projectMatch = scope.project_scopes.some(p => {
        if (p === '*') return true;
        if (p.endsWith('*')) {
          const prefix = p.slice(0, -1);
          return context.project_id!.startsWith(prefix);
        }
        return p === context.project_id;
      });
      if (!projectMatch) {
        return { allowed: false, reason: 'Project not in scope' };
      }
    }

    return { allowed: true };
  }

  private async checkRateLimits(agent: AgentRegistryEntry, context: EnforcementContext): Promise<{ allowed: boolean; reason?: string }> {
    const limits = agent.limits.execution;
    const now = new Date();

    // Check runs per minute
    const minuteAgo = new Date(now.getTime() - 60 * 1000);
    const runsLastMinute = await this.countRuns(agent.identity.id, context.tenant_id, minuteAgo);
    if (runsLastMinute >= limits.max_runs_per_minute) {
      return { allowed: false, reason: `Rate limit exceeded: ${runsLastMinute} runs in last minute >= ${limits.max_runs_per_minute}` };
    }

    // Check runs per hour
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const runsLastHour = await this.countRuns(agent.identity.id, context.tenant_id, hourAgo);
    if (runsLastHour >= limits.max_runs_per_hour) {
      return { allowed: false, reason: `Rate limit exceeded: ${runsLastHour} runs in last hour >= ${limits.max_runs_per_hour}` };
    }

    // Check runs per day
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const runsLastDay = await this.countRuns(agent.identity.id, context.tenant_id, dayAgo);
    if (runsLastDay >= limits.max_runs_per_day) {
      return { allowed: false, reason: `Rate limit exceeded: ${runsLastDay} runs in last day >= ${limits.max_runs_per_day}` };
    }

    return { allowed: true };
  }

  private async checkQuotas(agent: AgentRegistryEntry, context: EnforcementContext): Promise<{ allowed: boolean; reason?: string }> {
    // Query current quota usage from database
    const query = `
      SELECT quota_limit, quota_used, period_end
      FROM agent_quotas
      WHERE agent_id = $1 AND quota_type = $2 AND period_end > NOW()
      ORDER BY period_end DESC
      LIMIT 1
    `;
    const result = await this.pool.query(query, [agent.identity.id, agent.limits.budget.quota_type]);

    if (result.rows.length === 0) {
      // No quota record, allow (quota will be created on execution)
      return { allowed: true };
    }

    const quota = result.rows[0];
    if (quota.quota_used >= quota.quota_limit) {
      return { allowed: false, reason: `Quota exceeded: ${quota.quota_used} >= ${quota.quota_limit}` };
    }

    return { allowed: true };
  }

  private async countRuns(agentId: string, tenantId: string, since: Date): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM agent_runs
      WHERE agent_id = $1 AND tenant_id = $2 AND started_at >= $3
    `;
    const result = await this.pool.query(query, [agentId, tenantId, since]);
    return parseInt(result.rows[0]?.count || '0', 10);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const enforcementEngine = new EnforcementEngine();
