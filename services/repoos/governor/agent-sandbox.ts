/**
 * RepoOS Agent Proposal Sandbox
 *
 * Mediates between AI agent proposals and repository execution.
 * Agents can propose actions but cannot directly execute sensitive operations.
 *
 * This is THE critical safety layer that makes autonomous agents trustworthy.
 *
 * Design Philosophy:
 * - Agents propose, humans (or policy) approve
 * - Every proposal goes through policy evaluation
 * - No backdoors or shortcuts
 * - Full audit trail of agent behavior
 * - Graceful degradation when agents misbehave
 *
 * Goes beyond FAANG approach where agents often have direct write access.
 */

import {
  AgentActionProposal,
  GovernedActionResult,
  CandidateAction,
  AgentType,
  PolicyDecision,
  RiskForecast,
  RepoState,
  ExecutionMode,
  KillSwitches,
} from './decision-types.js';

import { policyEngine } from './policy-engine.js';
import { riskForecaster } from './risk-forecaster.js';

// ============================================================================
// AGENT REGISTRY
// ============================================================================

interface AgentMetadata {
  id: string;
  type: AgentType;
  description: string;
  trustScore: number;  // 0-1, based on historical performance
  successRate: number; // % of proposals that were accepted
  errorRate: number;   // % of proposals that caused problems
  totalProposals: number;
  enabled: boolean;
  capabilities: string[];
}

const AGENT_REGISTRY = new Map<string, AgentMetadata>([
  ['triage-agent-001', {
    id: 'triage-agent-001',
    type: 'triage',
    description: 'PR classification and routing agent',
    trustScore: 0.95,
    successRate: 0.92,
    errorRate: 0.02,
    totalProposals: 1247,
    enabled: true,
    capabilities: ['label_pr', 'assign_concern', 'defer'],
  }],
  ['batch-planner-001', {
    id: 'batch-planner-001',
    type: 'batch_planner',
    description: 'Intelligent PR batching agent',
    trustScore: 0.88,
    successRate: 0.84,
    errorRate: 0.05,
    totalProposals: 523,
    enabled: true,
    capabilities: ['batch_prs', 'defer'],
  }],
  ['review-agent-001', {
    id: 'review-agent-001',
    type: 'review',
    description: 'Automated review summarization',
    trustScore: 0.92,
    successRate: 0.90,
    errorRate: 0.01,
    totalProposals: 892,
    enabled: true,
    capabilities: ['label_pr', 'escalate_human'],
  }],
  ['remediation-agent-001', {
    id: 'remediation-agent-001',
    type: 'remediation',
    description: 'Automated fix generation',
    trustScore: 0.75,
    successRate: 0.70,
    errorRate: 0.12,
    totalProposals: 156,
    enabled: false, // Disabled until trust score improves
    capabilities: ['merge_pr', 'close_pr'],
  }],
]);

// ============================================================================
// PROPOSAL VALIDATION
// ============================================================================

interface ProposalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateProposal(proposal: AgentActionProposal): ProposalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!proposal.proposalId) {
    errors.push('Missing proposalId');
  }
  if (!proposal.agentId) {
    errors.push('Missing agentId');
  }
  if (!proposal.action) {
    errors.push('Missing action');
  }
  if (!proposal.rationale) {
    warnings.push('Missing rationale - provide explanation for transparency');
  }

  // Validate agent exists and is enabled
  const agent = AGENT_REGISTRY.get(proposal.agentId);
  if (!agent) {
    errors.push(`Unknown agent: ${proposal.agentId}`);
  } else if (!agent.enabled) {
    errors.push(`Agent disabled: ${proposal.agentId}`);
  } else if (agent.type !== proposal.agentType) {
    errors.push(`Agent type mismatch: expected ${agent.type}, got ${proposal.agentType}`);
  }

  // Check if agent has capability for proposed action
  if (agent && !agent.capabilities.includes(proposal.action.type)) {
    errors.push(
      `Agent ${proposal.agentId} not authorized for action type: ${proposal.action.type}`
    );
  }

  // Validate action structure
  if (proposal.action) {
    if (!proposal.action.type) {
      errors.push('Action missing type');
    }
    if (!proposal.action.targetIds || proposal.action.targetIds.length === 0) {
      errors.push('Action missing targetIds');
    }
  }

  // Check confidence if provided
  if (proposal.confidence !== undefined) {
    if (proposal.confidence < 0 || proposal.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    } else if (proposal.confidence < 0.5) {
      warnings.push('Low agent confidence in proposal');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// AGENT SANDBOX
// ============================================================================

export class AgentSandbox {
  private proposalHistory: Map<string, AgentActionProposal[]> = new Map();
  private blockedProposals: Map<string, number> = new Map();
  private readonly MAX_BLOCKED_BEFORE_DISABLE = 5;

  /**
   * Process agent proposal through governance pipeline
   */
  public async processProposal(
    proposal: AgentActionProposal,
    repoState: RepoState,
    executionMode: ExecutionMode = 'manual_approval_only',
    killSwitches?: Partial<KillSwitches>
  ): Promise<GovernedActionResult> {
    // Step 1: Validate proposal structure
    const validation = validateProposal(proposal);
    if (!validation.valid) {
      return {
        accepted: false,
        requiresHumanReview: true,
        policyDecision: {
          allowed: false,
          decision: 'deny',
          severity: 'high',
          reasons: [
            'Invalid proposal structure',
            ...validation.errors,
          ],
          evidence: {
            validationErrors: validation.errors,
            validationWarnings: validation.warnings,
          },
          policyRuleIds: ['sandbox.validation'],
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Step 2: Check if agent is being throttled (too many blocks)
    const blockCount = this.blockedProposals.get(proposal.agentId) || 0;
    if (blockCount >= this.MAX_BLOCKED_BEFORE_DISABLE) {
      return {
        accepted: false,
        requiresHumanReview: true,
        policyDecision: {
          allowed: false,
          decision: 'deny',
          severity: 'critical',
          reasons: [
            `Agent ${proposal.agentId} has been throttled`,
            `${blockCount} consecutive denied proposals`,
            'Agent behavior requires human investigation',
          ],
          evidence: {
            agentId: proposal.agentId,
            blockCount,
            threshold: this.MAX_BLOCKED_BEFORE_DISABLE,
          },
          policyRuleIds: ['sandbox.throttling'],
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Step 3: Run through policy engine
    const policyDecision = await policyEngine.evaluateCandidateAction(
      proposal.action,
      repoState,
      executionMode,
      killSwitches
    );

    // Step 4: Generate risk forecast if merging/batching
    let riskForecast: RiskForecast | undefined;
    if (proposal.action.type === 'merge_pr' || proposal.action.type === 'batch_prs') {
      try {
        if (proposal.action.type === 'merge_pr') {
          const pr = repoState.prs.find(
            p => p.id === proposal.action.targetIds[0] ||
              p.number.toString() === proposal.action.targetIds[0]
          );
          if (pr) {
            riskForecast = await riskForecaster.forecastPR(pr, repoState);
          }
        } else {
          riskForecast = await riskForecaster.forecastBatch(
            proposal.action.targetIds,
            repoState
          );
        }

        // Override policy decision if risk is too high
        if (riskForecast && riskForecast.recommendedAction === 'require_review') {
          policyDecision.decision = 'require_human_review';
          policyDecision.allowed = false;
          policyDecision.reasons.push(
            `Risk forecast recommends human review`,
            ...riskForecast.reasons
          );
        }
      } catch (error) {
        // Forecast failure shouldn't block the process
        console.warn('Risk forecast failed:', error);
      }
    }

    // Step 5: Record proposal in history
    this.recordProposal(proposal);

    // Step 6: Update agent metrics
    this.updateAgentMetrics(proposal.agentId, policyDecision.allowed);

    // Step 7: Return governed result
    const requiresHumanReview =
      policyDecision.decision === 'require_human_review' ||
      executionMode === 'manual_approval_only' ||
      !policyDecision.allowed;

    return {
      accepted: policyDecision.allowed && executionMode === 'governed_execute',
      requiresHumanReview,
      policyDecision,
      forecast: riskForecast,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record proposal in history
   */
  private recordProposal(proposal: AgentActionProposal): void {
    const agentHistory = this.proposalHistory.get(proposal.agentId) || [];
    agentHistory.push(proposal);

    // Keep last 100 proposals per agent
    if (agentHistory.length > 100) {
      agentHistory.shift();
    }

    this.proposalHistory.set(proposal.agentId, agentHistory);
  }

  /**
   * Update agent metrics based on outcome
   */
  private updateAgentMetrics(agentId: string, wasAllowed: boolean): void {
    const agent = AGENT_REGISTRY.get(agentId);
    if (!agent) return;

    agent.totalProposals++;

    if (wasAllowed) {
      agent.successRate = (
        (agent.successRate * (agent.totalProposals - 1)) + 1
      ) / agent.totalProposals;

      // Reset block count on success
      this.blockedProposals.set(agentId, 0);
    } else {
      // Increment block count
      const currentBlocks = this.blockedProposals.get(agentId) || 0;
      this.blockedProposals.set(agentId, currentBlocks + 1);

      agent.successRate = (
        (agent.successRate * (agent.totalProposals - 1))
      ) / agent.totalProposals;
    }

    // Update trust score (weighted average of success rate and low error rate)
    agent.trustScore = (agent.successRate * 0.7) + ((1 - agent.errorRate) * 0.3);

    // Auto-disable if trust score drops too low
    if (agent.trustScore < 0.5) {
      agent.enabled = false;
      console.warn(`Agent ${agentId} auto-disabled due to low trust score: ${agent.trustScore}`);
    }
  }

  /**
   * Get agent proposal history
   */
  public getAgentHistory(agentId: string): AgentActionProposal[] {
    return this.proposalHistory.get(agentId) || [];
  }

  /**
   * Get agent metrics
   */
  public getAgentMetrics(agentId: string): AgentMetadata | undefined {
    return AGENT_REGISTRY.get(agentId);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): AgentMetadata[] {
    return Array.from(AGENT_REGISTRY.values());
  }

  /**
   * Manually override agent status
   */
  public setAgentEnabled(agentId: string, enabled: boolean): void {
    const agent = AGENT_REGISTRY.get(agentId);
    if (agent) {
      agent.enabled = enabled;
      if (enabled) {
        this.blockedProposals.set(agentId, 0); // Reset blocks
      }
    }
  }

  /**
   * Get sandbox health metrics
   */
  public getHealthMetrics(): {
    totalAgents: number;
    enabledAgents: number;
    avgTrustScore: number;
    avgSuccessRate: number;
    totalProposals: number;
    blockedAgents: number;
  } {
    const agents = Array.from(AGENT_REGISTRY.values());
    const enabledAgents = agents.filter(a => a.enabled);

    return {
      totalAgents: agents.length,
      enabledAgents: enabledAgents.length,
      avgTrustScore: agents.reduce((sum, a) => sum + a.trustScore, 0) / agents.length,
      avgSuccessRate: agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length,
      totalProposals: agents.reduce((sum, a) => sum + a.totalProposals, 0),
      blockedAgents: Array.from(this.blockedProposals.values())
        .filter(count => count >= this.MAX_BLOCKED_BEFORE_DISABLE).length,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const agentSandbox = new AgentSandbox();

// ============================================================================
// AGENT BEHAVIOR MONITORING
// ============================================================================

/**
 * Detects anomalous agent behavior patterns
 */
export class AgentBehaviorMonitor {
  /**
   * Detect if agent is exhibiting concerning patterns
   */
  public detectAnomalies(agentId: string, recentProposals: AgentActionProposal[]): {
    hasAnomalies: boolean;
    anomalies: string[];
  } {
    const anomalies: string[] = [];

    // Pattern 1: Rapid-fire proposals (possible runaway agent)
    const timestamps = recentProposals.map(p => new Date(p.createdAt).getTime());
    const avgTimeBetween = this.calculateAvgTimeBetween(timestamps);
    if (avgTimeBetween < 5000) { // Less than 5 seconds between proposals
      anomalies.push('Rapid-fire proposal pattern detected (< 5s between proposals)');
    }

    // Pattern 2: Repetitive proposals (stuck in loop)
    const uniqueActions = new Set(recentProposals.map(p => JSON.stringify(p.action)));
    if (uniqueActions.size < recentProposals.length * 0.5) {
      anomalies.push('Repetitive proposal pattern detected (>50% duplicate actions)');
    }

    // Pattern 3: Escalating target counts (scope creep)
    const avgTargets = recentProposals.reduce((sum, p) => sum + p.action.targetIds.length, 0) / recentProposals.length;
    const recentAvgTargets = recentProposals.slice(-5).reduce((sum, p) => sum + p.action.targetIds.length, 0) / 5;
    if (recentAvgTargets > avgTargets * 2) {
      anomalies.push('Escalating scope detected (target count increasing)');
    }

    // Pattern 4: Low confidence proposals
    const lowConfidenceCount = recentProposals.filter(
      p => p.confidence !== undefined && p.confidence < 0.4
    ).length;
    if (lowConfidenceCount > recentProposals.length * 0.5) {
      anomalies.push('High rate of low-confidence proposals');
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
    };
  }

  private calculateAvgTimeBetween(timestamps: number[]): number {
    if (timestamps.length < 2) return Infinity;

    const diffs = [];
    for (let i = 1; i < timestamps.length; i++) {
      diffs.push(timestamps[i] - timestamps[i - 1]);
    }

    return diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
  }
}

export const behaviorMonitor = new AgentBehaviorMonitor();
