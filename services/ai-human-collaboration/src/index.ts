/**
 * AI-Human Collaboration Service
 *
 * Serves as an AI teammate—not a replacement—offering:
 * - Instant recommendations with confidence scoring
 * - Probable outcome highlighting
 * - Human-in-the-loop overrides with single action
 * - Continuous learning from operator feedback
 * - Full mission traceability for all automated actions
 */

export * from './types.js';
export * from './performance.js';
export * from './events.js';
export * from './persistence.js';
export * from './instrumentation.js';
export * from './integrations/index.js';
export { RecommendationEngine } from './RecommendationEngine.js';
export { CommanderControl } from './CommanderControl.js';
export { FeedbackCollector } from './FeedbackCollector.js';
export { MissionTraceability } from './MissionTraceability.js';

import { randomUUID } from 'crypto';
import {
  Recommendation,
  CommanderDecision,
  OperatorFeedback,
  CollaborationSession,
  CollaborationConfig,
  DEFAULT_COLLABORATION_CONFIG,
  AutonomyLevel,
} from './types.js';
import { RecommendationEngine } from './RecommendationEngine.js';
import { CommanderControl } from './CommanderControl.js';
import { FeedbackCollector } from './FeedbackCollector.js';
import { MissionTraceability } from './MissionTraceability.js';

interface Commander {
  id: string;
  name: string;
  role: string;
  authority: string;
  permissions: string[];
}

interface Operator {
  id: string;
  name: string;
  role: string;
}

/**
 * Main collaboration service orchestrating AI-Human teamwork
 */
export class AIHumanCollaborationService {
  private config: CollaborationConfig;
  private recommendations: Map<string, Recommendation> = new Map();
  private decisions: Map<string, CommanderDecision> = new Map();

  public readonly engine: RecommendationEngine;
  public readonly control: CommanderControl;
  public readonly feedback: FeedbackCollector;
  public readonly traceability: MissionTraceability;

  private sessions: Map<string, CollaborationSession> = new Map();

  constructor(config: Partial<CollaborationConfig> = {}) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };

    this.engine = new RecommendationEngine(this.config);
    this.control = new CommanderControl(this.recommendations, this.config);
    this.feedback = new FeedbackCollector(
      this.recommendations,
      this.decisions,
      this.config
    );
    this.traceability = new MissionTraceability();
  }

  /**
   * Start a new collaboration session for a mission
   */
  startSession(
    missionId: string,
    commanderId: string,
    autonomyLevel?: AutonomyLevel
  ): CollaborationSession {
    const session: CollaborationSession = {
      id: randomUUID(),
      missionId,
      startedAt: new Date().toISOString(),

      autonomyLevel: autonomyLevel || this.config.defaultAutonomyLevel,
      autoApprovalThreshold: this.config.autoApprovalThreshold,

      commanderId,
      operators: [],

      stats: {
        recommendationsGenerated: 0,
        recommendationsAccepted: 0,
        recommendationsRejected: 0,
        recommendationsModified: 0,
        averageConfidence: 0,
        averageRating: 0,
        feedbackCount: 0,
      },

      status: 'active',
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Generate a recommendation with full traceability
   */
  async recommend(
    missionId: string,
    action: string,
    actionType: string,
    parameters: Record<string, unknown>,
    context: Record<string, unknown> = {}
  ): Promise<Recommendation> {
    const session = this.getActiveSession(missionId);

    const recommendation = await this.engine.generateRecommendation(
      { missionId, context, action, actionType, parameters },
      session?.autonomyLevel
    );

    this.recommendations.set(recommendation.id, recommendation);

    // Record in audit trail
    this.traceability.recordRecommendation(recommendation);

    // Update session stats
    if (session) {
      session.stats.recommendationsGenerated++;
      this.updateAverageConfidence(session);
    }

    // Auto-approve if eligible
    if (this.engine.canAutoApprove(recommendation)) {
      // Auto-accept with system authority
      const systemCommander: Commander = {
        id: 'system-auto-approver',
        name: 'Auto-Approval System',
        role: 'mission_commander',
        authority: 'auto-approval',
        permissions: ['accept'],
      };

      await this.decide(
        recommendation.id,
        'accepted',
        systemCommander,
        'Auto-approved: high confidence, low risk'
      );
    }

    return recommendation;
  }

  /**
   * Commander makes a decision on a recommendation
   */
  async decide(
    recommendationId: string,
    outcome: 'accepted' | 'rejected' | 'modified' | 'deferred',
    commander: Commander,
    reason: string,
    modifiedAction?: string,
    modifiedParameters?: Record<string, unknown>
  ): Promise<CommanderDecision> {
    let decision: CommanderDecision;

    switch (outcome) {
      case 'accepted':
        decision = await this.control.accept(recommendationId, commander, reason);
        break;
      case 'rejected':
        decision = await this.control.reject(recommendationId, commander, reason);
        break;
      case 'modified':
        decision = await this.control.modify(
          recommendationId,
          commander,
          reason,
          modifiedAction!,
          modifiedParameters!
        );
        break;
      case 'deferred':
        decision = await this.control.defer(recommendationId, commander, reason);
        break;
    }

    this.decisions.set(decision.id, decision);

    // Record in audit trail
    this.traceability.recordDecision(decision);

    if (decision.executionResult) {
      this.traceability.recordExecution(decision, decision.executionResult);
    }

    // Update session stats
    const session = this.getActiveSession(decision.missionId);
    if (session) {
      switch (outcome) {
        case 'accepted':
          session.stats.recommendationsAccepted++;
          break;
        case 'rejected':
          session.stats.recommendationsRejected++;
          break;
        case 'modified':
          session.stats.recommendationsModified++;
          break;
      }
    }

    return decision;
  }

  /**
   * Submit operator feedback for continuous learning
   */
  async submitFeedback(
    recommendationId: string,
    operator: Operator,
    rating: number,
    wasCorrect: boolean,
    sentiment: 'positive' | 'negative' | 'neutral' | 'corrective' = 'neutral',
    comments?: string,
    correctAction?: string,
    correctParameters?: Record<string, unknown>
  ): Promise<OperatorFeedback> {
    const fb = await this.feedback.submitFeedback(
      {
        recommendationId,
        sentiment,
        rating,
        comments,
        wasCorrect,
        correctAction,
        correctParameters,
      },
      operator
    );

    // Record in audit trail
    this.traceability.recordFeedback(fb);

    // Update session stats
    const recommendation = this.recommendations.get(recommendationId);
    if (recommendation) {
      const session = this.getActiveSession(recommendation.missionId);
      if (session) {
        session.stats.feedbackCount++;
        this.updateAverageRating(session);
      }
    }

    return fb;
  }

  /**
   * Get highlighted outcomes for commander review
   */
  getOutcomeHighlights(recommendationId: string) {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) return null;
    return this.engine.highlightOutcomes(recommendation);
  }

  /**
   * Get full mission audit trail
   */
  getMissionAuditTrail(missionId: string) {
    return this.traceability.getMissionTrail(missionId);
  }

  /**
   * Verify mission audit integrity
   */
  verifyMissionIntegrity(missionId: string) {
    return this.traceability.verifyIntegrity(missionId);
  }

  /**
   * Get session by mission
   */
  getActiveSession(missionId: string): CollaborationSession | undefined {
    return Array.from(this.sessions.values()).find(
      (s) => s.missionId === missionId && s.status === 'active'
    );
  }

  /**
   * End a collaboration session
   */
  endSession(sessionId: string): CollaborationSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.status = 'completed';
    session.endedAt = new Date().toISOString();
    return session;
  }

  /**
   * Get comprehensive statistics
   */
  getStatistics(missionId: string) {
    return {
      session: this.getActiveSession(missionId)?.stats,
      feedback: this.feedback.getStatistics(),
      traceability: this.traceability.getMissionStats(missionId),
      decisions: this.control.getMissionStats(missionId),
    };
  }

  private updateAverageConfidence(session: CollaborationSession): void {
    const missionRecs = Array.from(this.recommendations.values()).filter(
      (r) => r.missionId === session.missionId
    );
    if (missionRecs.length > 0) {
      session.stats.averageConfidence =
        missionRecs.reduce((sum, r) => sum + r.confidence, 0) / missionRecs.length;
    }
  }

  private updateAverageRating(session: CollaborationSession): void {
    const missionFb = this.feedback.getFeedbackForMission(session.missionId);
    if (missionFb.length > 0) {
      session.stats.averageRating =
        missionFb.reduce((sum, f) => sum + f.rating, 0) / missionFb.length;
    }
  }
}

export default AIHumanCollaborationService;
