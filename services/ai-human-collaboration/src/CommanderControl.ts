/**
 * CommanderControl - Human-in-the-loop override capability
 * Enables single-action overrides with full authority tracking
 */

import { randomUUID } from 'crypto';
import {
  Recommendation,
  CommanderDecision,
  DecisionOutcome,
  ExecutionResult,
  CollaborationConfig,
  DEFAULT_COLLABORATION_CONFIG,
} from './types.js';

interface DecisionInput {
  recommendationId: string;
  outcome: DecisionOutcome;
  reason: string;
  modifiedAction?: string;
  modifiedParameters?: Record<string, unknown>;
}

interface Commander {
  id: string;
  name: string;
  role: string;
  authority: string;
  permissions: string[];
}

type ActionExecutor = (
  action: string,
  parameters: Record<string, unknown>,
  context: Record<string, unknown>
) => Promise<ExecutionResult>;

/**
 * Service enabling commander control over AI recommendations
 */
export class CommanderControl {
  private config: CollaborationConfig;
  private decisions: Map<string, CommanderDecision> = new Map();
  private recommendations: Map<string, Recommendation>;
  private actionExecutor?: ActionExecutor;

  constructor(
    recommendations: Map<string, Recommendation>,
    config: Partial<CollaborationConfig> = {},
    actionExecutor?: ActionExecutor
  ) {
    this.recommendations = recommendations;
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };
    this.actionExecutor = actionExecutor;
  }

  /**
   * Single-action override: Accept recommendation as-is
   */
  async accept(
    recommendationId: string,
    commander: Commander,
    reason: string,
    traceId?: string
  ): Promise<CommanderDecision> {
    return this.processDecision(
      {
        recommendationId,
        outcome: 'accepted',
        reason,
      },
      commander,
      traceId
    );
  }

  /**
   * Single-action override: Reject recommendation
   */
  async reject(
    recommendationId: string,
    commander: Commander,
    reason: string,
    traceId?: string
  ): Promise<CommanderDecision> {
    return this.processDecision(
      {
        recommendationId,
        outcome: 'rejected',
        reason,
      },
      commander,
      traceId
    );
  }

  /**
   * Single-action override: Modify and execute
   */
  async modify(
    recommendationId: string,
    commander: Commander,
    reason: string,
    modifiedAction: string,
    modifiedParameters: Record<string, unknown>,
    traceId?: string
  ): Promise<CommanderDecision> {
    return this.processDecision(
      {
        recommendationId,
        outcome: 'modified',
        reason,
        modifiedAction,
        modifiedParameters,
      },
      commander,
      traceId
    );
  }

  /**
   * Single-action override: Defer for later review
   */
  async defer(
    recommendationId: string,
    commander: Commander,
    reason: string,
    traceId?: string
  ): Promise<CommanderDecision> {
    return this.processDecision(
      {
        recommendationId,
        outcome: 'deferred',
        reason,
      },
      commander,
      traceId
    );
  }

  /**
   * Process a commander decision
   */
  async processDecision(
    input: DecisionInput,
    commander: Commander,
    traceId?: string
  ): Promise<CommanderDecision> {
    const recommendation = this.recommendations.get(input.recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${input.recommendationId}`);
    }

    // Validate commander authority
    this.validateAuthority(commander, recommendation, input.outcome);

    const decision: CommanderDecision = {
      id: randomUUID(),
      recommendationId: input.recommendationId,
      missionId: recommendation.missionId,
      timestamp: new Date().toISOString(),

      outcome: input.outcome,
      commanderId: commander.id,
      commanderRole: commander.role,

      originalAction: recommendation.action,
      modifiedAction: input.modifiedAction,
      modifiedParameters: input.modifiedParameters,

      reason: input.reason,
      authority: commander.authority,

      traceId: traceId || recommendation.traceId,
      spanId: randomUUID(),
    };

    // Execute if accepted or modified
    if (input.outcome === 'accepted' || input.outcome === 'modified') {
      decision.executionResult = await this.executeAction(
        decision,
        recommendation
      );
      decision.executedAt = new Date().toISOString();
    }

    this.decisions.set(decision.id, decision);
    return decision;
  }

  /**
   * Get decision by ID
   */
  getDecision(id: string): CommanderDecision | undefined {
    return this.decisions.get(id);
  }

  /**
   * Get all decisions for a recommendation
   */
  getDecisionsForRecommendation(recommendationId: string): CommanderDecision[] {
    return Array.from(this.decisions.values()).filter(
      (d) => d.recommendationId === recommendationId
    );
  }

  /**
   * Get all decisions for a mission
   */
  getDecisionsForMission(missionId: string): CommanderDecision[] {
    return Array.from(this.decisions.values()).filter(
      (d) => d.missionId === missionId
    );
  }

  /**
   * Get pending recommendations requiring commander action
   */
  getPendingForCommander(commanderId: string): Recommendation[] {
    const now = new Date();
    const decidedIds = new Set(
      Array.from(this.decisions.values()).map((d) => d.recommendationId)
    );

    return Array.from(this.recommendations.values()).filter(
      (r) =>
        r.requiresApproval &&
        !decidedIds.has(r.id) &&
        new Date(r.expiresAt) > now
    );
  }

  /**
   * Check if commander has authority for action
   */
  hasAuthority(commander: Commander, action: string): boolean {
    // Check specific permission
    if (commander.permissions.includes(action)) return true;
    if (commander.permissions.includes('*')) return true;

    // Check role-based authority
    const rolePermissions: Record<string, string[]> = {
      'mission_commander': ['*'],
      'team_lead': ['accept', 'reject', 'modify', 'defer'],
      'operator': ['accept', 'defer'],
      'observer': [],
    };

    const allowed = rolePermissions[commander.role] || [];
    return allowed.includes(action) || allowed.includes('*');
  }

  /**
   * Validate commander authority for decision
   */
  private validateAuthority(
    commander: Commander,
    recommendation: Recommendation,
    outcome: DecisionOutcome
  ): void {
    // Check basic decision authority
    if (!this.hasAuthority(commander, outcome)) {
      throw new Error(
        `Commander ${commander.id} lacks authority for ${outcome} decisions`
      );
    }

    // Critical risk requires elevated authority
    if (recommendation.riskLevel === 'critical') {
      if (commander.role !== 'mission_commander') {
        throw new Error(
          'Critical risk decisions require mission_commander authority'
        );
      }
    }

    // Modification requires specific permission
    if (outcome === 'modified') {
      if (!this.hasAuthority(commander, 'modify')) {
        throw new Error(
          `Commander ${commander.id} lacks authority to modify recommendations`
        );
      }
    }
  }

  /**
   * Execute the decided action
   */
  private async executeAction(
    decision: CommanderDecision,
    recommendation: Recommendation
  ): Promise<ExecutionResult> {
    const action = decision.modifiedAction || recommendation.action;
    const parameters = decision.modifiedParameters || recommendation.parameters;

    const startTime = Date.now();

    try {
      if (this.actionExecutor) {
        return await this.actionExecutor(action, parameters, {
          missionId: decision.missionId,
          decisionId: decision.id,
          commanderId: decision.commanderId,
          traceId: decision.traceId,
        });
      }

      // Default execution (simulation)
      return {
        success: true,
        output: { action, parameters, executed: true },
        duration: Date.now() - startTime,
        sideEffects: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        sideEffects: [],
      };
    }
  }

  /**
   * Set custom action executor
   */
  setActionExecutor(executor: ActionExecutor): void {
    this.actionExecutor = executor;
  }

  /**
   * Get decision statistics for a mission
   */
  getMissionStats(missionId: string): {
    total: number;
    accepted: number;
    rejected: number;
    modified: number;
    deferred: number;
    successRate: number;
  } {
    const decisions = this.getDecisionsForMission(missionId);
    const executed = decisions.filter((d) => d.executionResult);
    const successful = executed.filter((d) => d.executionResult?.success);

    return {
      total: decisions.length,
      accepted: decisions.filter((d) => d.outcome === 'accepted').length,
      rejected: decisions.filter((d) => d.outcome === 'rejected').length,
      modified: decisions.filter((d) => d.outcome === 'modified').length,
      deferred: decisions.filter((d) => d.outcome === 'deferred').length,
      successRate: executed.length > 0 ? successful.length / executed.length : 0,
    };
  }
}
