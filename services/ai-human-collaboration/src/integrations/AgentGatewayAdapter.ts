/**
 * Adapter for integrating AI-Human Collaboration with Agent Gateway
 * Enables approval workflows through the collaboration service
 */

import {
  Recommendation,
  CommanderDecision,
  CollaborationConfig,
  DEFAULT_COLLABORATION_CONFIG,
} from '../types.js';
import { RecommendationEngine } from '../RecommendationEngine.js';
import { MissionTraceability } from '../MissionTraceability.js';

/**
 * Agent action from gateway
 */
export interface AgentAction {
  id: string;
  agentId: string;
  runId: string;
  type: string;
  category: string;
  parameters: Record<string, unknown>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

/**
 * Approval result for gateway
 */
export interface ApprovalResult {
  approved: boolean;
  reason: string;
  recommendationId?: string;
  decisionId?: string;
  modifiedAction?: string;
  modifiedParameters?: Record<string, unknown>;
  traceId: string;
}

/**
 * Commander info from gateway auth context
 */
export interface GatewayCommander {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
}

type DecisionCallback = (
  recommendation: Recommendation
) => Promise<CommanderDecision | null>;

/**
 * Adapter connecting AI-Human Collaboration to Agent Gateway
 */
export class AgentGatewayAdapter {
  private engine: RecommendationEngine;
  private traceability: MissionTraceability;
  private config: CollaborationConfig;
  private pendingApprovals: Map<string, Recommendation> = new Map();
  private decisionCallback?: DecisionCallback;

  constructor(
    config: Partial<CollaborationConfig> = {},
    engine?: RecommendationEngine,
    traceability?: MissionTraceability
  ) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };
    this.engine = engine || new RecommendationEngine(this.config);
    this.traceability = traceability || new MissionTraceability();
  }

  /**
   * Process an agent action through collaboration workflow
   */
  async processAction(action: AgentAction): Promise<ApprovalResult> {
    // Generate recommendation from action
    const recommendation = await this.engine.generateRecommendation(
      {
        missionId: action.runId,
        context: action.context || {},
        action: action.type,
        actionType: action.category,
        parameters: action.parameters,
      },
      this.config.defaultAutonomyLevel
    );

    // Record in audit trail
    this.traceability.recordRecommendation(recommendation);

    // Check for auto-approval
    if (this.engine.canAutoApprove(recommendation)) {
      return {
        approved: true,
        reason: `Auto-approved: confidence ${(recommendation.confidence * 100).toFixed(1)}%, risk ${recommendation.riskLevel}`,
        recommendationId: recommendation.id,
        traceId: recommendation.traceId,
      };
    }

    // Store for pending approval
    this.pendingApprovals.set(recommendation.id, recommendation);

    // If callback is set, wait for decision
    if (this.decisionCallback) {
      const decision = await this.decisionCallback(recommendation);

      if (decision) {
        this.traceability.recordDecision(decision);

        return {
          approved: decision.outcome === 'accepted' || decision.outcome === 'modified',
          reason: decision.reason,
          recommendationId: recommendation.id,
          decisionId: decision.id,
          modifiedAction: decision.modifiedAction,
          modifiedParameters: decision.modifiedParameters,
          traceId: decision.traceId,
        };
      }
    }

    // Return pending status
    return {
      approved: false,
      reason: 'Awaiting commander approval',
      recommendationId: recommendation.id,
      traceId: recommendation.traceId,
    };
  }

  /**
   * Approve a pending action
   */
  async approve(
    recommendationId: string,
    commander: GatewayCommander,
    reason: string
  ): Promise<ApprovalResult> {
    const recommendation = this.pendingApprovals.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    const decision = this.createDecision(
      recommendation,
      'accepted',
      commander,
      reason
    );

    this.traceability.recordDecision(decision);
    this.pendingApprovals.delete(recommendationId);

    return {
      approved: true,
      reason,
      recommendationId,
      decisionId: decision.id,
      traceId: decision.traceId,
    };
  }

  /**
   * Reject a pending action
   */
  async reject(
    recommendationId: string,
    commander: GatewayCommander,
    reason: string
  ): Promise<ApprovalResult> {
    const recommendation = this.pendingApprovals.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    const decision = this.createDecision(
      recommendation,
      'rejected',
      commander,
      reason
    );

    this.traceability.recordDecision(decision);
    this.pendingApprovals.delete(recommendationId);

    return {
      approved: false,
      reason,
      recommendationId,
      decisionId: decision.id,
      traceId: decision.traceId,
    };
  }

  /**
   * Modify and approve a pending action
   */
  async modifyAndApprove(
    recommendationId: string,
    commander: GatewayCommander,
    reason: string,
    modifiedAction: string,
    modifiedParameters: Record<string, unknown>
  ): Promise<ApprovalResult> {
    const recommendation = this.pendingApprovals.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    const decision = this.createDecision(
      recommendation,
      'modified',
      commander,
      reason,
      modifiedAction,
      modifiedParameters
    );

    this.traceability.recordDecision(decision);
    this.pendingApprovals.delete(recommendationId);

    return {
      approved: true,
      reason,
      recommendationId,
      decisionId: decision.id,
      modifiedAction,
      modifiedParameters,
      traceId: decision.traceId,
    };
  }

  /**
   * Get pending approvals for a user
   */
  getPendingApprovals(commander: GatewayCommander): Recommendation[] {
    const now = new Date();
    return Array.from(this.pendingApprovals.values()).filter(
      (r) => new Date(r.expiresAt) > now
    );
  }

  /**
   * Set callback for async decision handling
   */
  setDecisionCallback(callback: DecisionCallback): void {
    this.decisionCallback = callback;
  }

  /**
   * Get audit trail for a run
   */
  getRunAuditTrail(runId: string) {
    return this.traceability.getMissionTrail(runId);
  }

  /**
   * Verify audit integrity for a run
   */
  verifyRunIntegrity(runId: string) {
    return this.traceability.verifyIntegrity(runId);
  }

  private createDecision(
    recommendation: Recommendation,
    outcome: 'accepted' | 'rejected' | 'modified',
    commander: GatewayCommander,
    reason: string,
    modifiedAction?: string,
    modifiedParameters?: Record<string, unknown>
  ): CommanderDecision {
    return {
      id: crypto.randomUUID(),
      recommendationId: recommendation.id,
      missionId: recommendation.missionId,
      timestamp: new Date().toISOString(),

      outcome,
      commanderId: commander.userId,
      commanderRole: commander.roles[0] || 'operator',

      originalAction: recommendation.action,
      modifiedAction,
      modifiedParameters,

      reason,
      authority: commander.roles.includes('mission_commander') ? 'full' : 'limited',

      traceId: recommendation.traceId,
      spanId: crypto.randomUUID(),
    };
  }
}
