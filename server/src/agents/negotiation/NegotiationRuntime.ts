/**
 * Negotiation Runtime
 *
 * Policy-aware runtime for multi-agent negotiations.
 * Enforces the Negotiation Protocol with:
 * - Turn limits and timeouts
 * - Policy checks at every phase
 * - Full transcript capture
 * - Automatic abort on violations
 *
 * SOC 2 Controls: CC6.1 (Access), CC8.1 (Change management)
 *
 * @module agents/negotiation/NegotiationRuntime
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { PolicyEngine } from '../../governance/PolicyEngine.ts';
import { PolicyContext, GovernanceVerdict } from '../../governance/types.ts';
import logger from '../../utils/logger.ts';
import {
  NegotiationRequest,
  NegotiationSession,
  NegotiationMessage,
  ProposalMessage,
  ChallengeMessage,
  ResolutionMessage,
  ApprovalMessage,
  AcceptanceMessage,
  NegotiationLimits,
  NegotiationState,
  NegotiationOutcome,
  NegotiationType,
  NegotiationError,
  NegotiationAuditEvent,
  RedactedTranscript,
  RedactedMessage,
  ProposalScore,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
} from './types.ts';

// ============================================================================
// Configuration
// ============================================================================

export interface NegotiationRuntimeConfig {
  enablePolicyChecks: boolean;
  enableAuditLog: boolean;
  defaultLimits: NegotiationLimits;
  scoringWeights: ScoringWeights;
}

const DEFAULT_CONFIG: NegotiationRuntimeConfig = {
  enablePolicyChecks: true,
  enableAuditLog: true,
  defaultLimits: {
    maxTurns: 10,
    maxCounterProposals: 3,
    maxChallenges: 2,
    maxConcurrentNegotiations: 1,
    perTurnTimeoutMs: 60000, // 1 minute
    totalTimeoutMs: 600000, // 10 minutes
    approvalWindowMs: 86400000, // 24 hours
  },
  scoringWeights: DEFAULT_SCORING_WEIGHTS,
};

const MAX_LIMITS: NegotiationLimits = {
  maxTurns: 20,
  maxCounterProposals: 5,
  maxChallenges: 4,
  maxConcurrentNegotiations: 3,
  perTurnTimeoutMs: 300000, // 5 minutes
  totalTimeoutMs: 1800000, // 30 minutes
  approvalWindowMs: 604800000, // 7 days
};

// ============================================================================
// Negotiation Runtime
// ============================================================================

export class NegotiationRuntime extends EventEmitter {
  private config: NegotiationRuntimeConfig;
  private policyEngine: PolicyEngine;
  private activeSessions: Map<string, NegotiationSession>;
  private auditEvents: NegotiationAuditEvent[];

  constructor(config?: Partial<NegotiationRuntimeConfig>, policyEngine?: PolicyEngine) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policyEngine = policyEngine || new PolicyEngine();
    this.activeSessions = new Map();
    this.auditEvents = [];

    logger.info('[NegotiationRuntime] Initialized with policy enforcement');
  }

  // ==========================================================================
  // Negotiation Lifecycle
  // ==========================================================================

  /**
   * Initiate a new negotiation.
   */
  public async initiate(request: NegotiationRequest): Promise<NegotiationSession> {
    logger.info('[NegotiationRuntime] Initiating negotiation', {
      type: request.type,
      tenantId: request.tenantId,
    });

    // Step 1: Pre-negotiation policy check
    const verdict = await this.checkPreNegotiationPolicy(request);
    if (verdict.action === 'DENY') {
      throw new NegotiationError(
        `Policy denied negotiation: ${verdict.reasons.join(', ')}`,
        'POLICY_DENIED',
        { verdict }
      );
    }

    // Step 2: Create session
    const negotiationId = uuidv4();
    const limits = this.normalizeLimits(request.limits);

    const session: NegotiationSession = {
      negotiationId,
      type: request.type,
      state: 'INIT',
      tenantId: request.tenantId,
      participants: {
        proposerId: request.proposerId,
        challengerId: request.challengerId,
        arbiterId: request.arbiterId,
      },
      limits,
      transcript: [],
      currentTurn: 0,
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      policyVerdicts: [verdict],
    };

    // Step 3: Create initial proposal message
    const initialMessage: ProposalMessage = {
      messageId: uuidv4(),
      negotiationId,
      role: 'proposer',
      type: 'proposal',
      turn: 1,
      timestamp: new Date().toISOString(),
      proposal: {
        goal: request.initialProposal.goal,
        terms: request.initialProposal.terms,
        justification: request.initialProposal.justification,
        evidence: request.initialProposal.evidence || [],
        tradeoffs: [],
      },
      metadata: {
        agentId: request.proposerId,
        tenantId: request.tenantId,
        confidence: 0.8,
      },
    };

    session.transcript.push(initialMessage);
    session.currentTurn = 1;
    session.state = 'CHALLENGE';

    // Step 4: Store session
    this.activeSessions.set(negotiationId, session);

    // Step 5: Emit audit event
    this.emitAuditEvent({
      eventType: 'negotiation_initiated',
      negotiationId,
      turn: 1,
      agentId: request.proposerId,
      role: 'proposer',
      policyVerdict: verdict.action,
      timestamp: new Date().toISOString(),
    });

    logger.info(`[NegotiationRuntime] Negotiation ${negotiationId} initiated`);
    return session;
  }

  /**
   * Submit a message to an ongoing negotiation.
   */
  public async submitMessage(
    negotiationId: string,
    message: Omit<ProposalMessage | ChallengeMessage, 'messageId' | 'negotiationId' | 'timestamp' | 'turn'>
  ): Promise<NegotiationSession> {
    const session = this.getSession(negotiationId);

    // Check state
    if (session.state === 'CLOSED' || session.state === 'ABORTED') {
      throw new NegotiationError(
        `Cannot submit message: negotiation is ${session.state}`,
        'INVALID_STATE'
      );
    }

    // Check timeout
    this.checkTimeout(session);

    // Check turn limit
    if (session.currentTurn >= session.limits.maxTurns) {
      return this.abort(negotiationId, 'Turn limit exceeded');
    }

    // Increment turn
    session.currentTurn++;

    // Build full message
    const fullMessage: NegotiationMessage = {
      ...message,
      messageId: uuidv4(),
      negotiationId,
      timestamp: new Date().toISOString(),
      turn: session.currentTurn,
    } as NegotiationMessage;

    // Per-turn policy check
    const verdict = await this.checkPerTurnPolicy(session, fullMessage);
    session.policyVerdicts.push(verdict);

    if (verdict.action === 'DENY') {
      return this.abort(negotiationId, `Policy denied message: ${verdict.reasons.join(', ')}`);
    }

    // Validate message schema
    this.validateMessage(fullMessage);

    // Add to transcript
    session.transcript.push(fullMessage);
    session.lastActivityTime = Date.now();

    // Update state
    if ('type' in fullMessage && fullMessage.type === 'acceptance') {
      session.state = 'RESOLUTION';
      return this.resolve(negotiationId, 'agreement');
    }

    // Emit audit event
    this.emitAuditEvent({
      eventType: 'negotiation_turn',
      negotiationId,
      turn: session.currentTurn,
      agentId: (fullMessage as any).metadata?.agentId,
      role: fullMessage.role,
      policyVerdict: verdict.action,
      timestamp: new Date().toISOString(),
    });

    logger.info(`[NegotiationRuntime] Turn ${session.currentTurn} in ${negotiationId}`);
    return session;
  }

  /**
   * Resolve a negotiation.
   */
  public async resolve(
    negotiationId: string,
    outcome: NegotiationOutcome,
    rationale?: string
  ): Promise<NegotiationSession> {
    const session = this.getSession(negotiationId);

    logger.info(`[NegotiationRuntime] Resolving ${negotiationId} with outcome: ${outcome}`);

    // Determine final terms
    let finalTerms: Record<string, any> | undefined;
    if (outcome === 'agreement') {
      // Find last accepted proposal
      const lastProposal = this.findLastProposal(session);
      finalTerms = lastProposal?.proposal.terms;
    } else if (outcome === 'disagreement') {
      // Score proposals and recommend highest
      const scored = this.scoreProposals(session);
      if (scored.length > 0) {
        const highestScored = scored[0];
        const proposal = session.transcript.find(
          (m) => m.messageId === highestScored.proposalId
        ) as ProposalMessage | undefined;
        finalTerms = proposal?.proposal.terms;
      }
    }

    // Pre-resolution policy check
    if (finalTerms) {
      const verdict = await this.checkPreResolutionPolicy(session, finalTerms);
      session.policyVerdicts.push(verdict);

      if (verdict.action === 'DENY') {
        return this.abort(negotiationId, `Policy denied resolution: ${verdict.reasons.join(', ')}`);
      }
    }

    // Create resolution message
    const resolutionMessage: ResolutionMessage = {
      messageId: uuidv4(),
      negotiationId,
      role: session.participants.arbiterId ? 'arbiter' : 'system',
      type: 'resolution',
      turn: session.currentTurn + 1,
      timestamp: new Date().toISOString(),
      resolution: {
        outcome,
        finalTerms,
        rationale: rationale || `Negotiation ${outcome}`,
        requiredApprovals: outcome === 'agreement' ? ['policy:negotiation_approval'] : [],
      },
      metadata: {
        totalTurns: session.currentTurn,
        durationMs: Date.now() - session.startTime,
        participantAgents: [session.participants.proposerId, session.participants.challengerId],
      },
    };

    session.transcript.push(resolutionMessage);
    session.state = outcome === 'agreement' ? 'APPROVAL' : 'CLOSED';
    session.outcome = outcome;
    session.finalTerms = finalTerms;
    session.endTime = Date.now();

    // Emit audit event
    this.emitAuditEvent({
      eventType: 'negotiation_resolved',
      negotiationId,
      turn: session.currentTurn + 1,
      outcome,
      policyVerdict: 'ALLOW',
      timestamp: new Date().toISOString(),
    });

    return session;
  }

  /**
   * Approve a resolved negotiation.
   */
  public async approve(
    negotiationId: string,
    decision: 'approved' | 'rejected' | 'conditional',
    approverIdentity: string,
    remarks?: string,
    conditions?: string[]
  ): Promise<NegotiationSession> {
    const session = this.getSession(negotiationId);

    if (session.state !== 'APPROVAL') {
      throw new NegotiationError(
        'Can only approve negotiations in APPROVAL state',
        'INVALID_STATE'
      );
    }

    const approvalMessage: ApprovalMessage = {
      messageId: uuidv4(),
      negotiationId,
      role: 'policy_engine',
      type: 'approval',
      timestamp: new Date().toISOString(),
      decision,
      approverIdentity,
      remarks,
      conditions,
    };

    session.transcript.push(approvalMessage);
    session.state = 'CLOSED';

    // Emit audit event
    this.emitAuditEvent({
      eventType: 'negotiation_approved',
      negotiationId,
      turn: session.currentTurn,
      outcome: session.outcome,
      policyVerdict: decision.toUpperCase(),
      timestamp: new Date().toISOString(),
    });

    logger.info(`[NegotiationRuntime] Negotiation ${negotiationId} ${decision}`);
    return session;
  }

  /**
   * Abort a negotiation.
   */
  public async abort(negotiationId: string, reason: string): Promise<NegotiationSession> {
    const session = this.getSession(negotiationId);

    logger.warn(`[NegotiationRuntime] Aborting ${negotiationId}: ${reason}`);

    session.state = 'ABORTED';
    session.outcome = 'aborted';
    session.abortReason = reason;
    session.endTime = Date.now();

    // Create resolution message
    const resolutionMessage: ResolutionMessage = {
      messageId: uuidv4(),
      negotiationId,
      role: 'system',
      type: 'resolution',
      turn: session.currentTurn + 1,
      timestamp: new Date().toISOString(),
      resolution: {
        outcome: 'aborted',
        rationale: reason,
        requiredApprovals: [],
      },
      metadata: {
        totalTurns: session.currentTurn,
        durationMs: Date.now() - session.startTime,
        participantAgents: [session.participants.proposerId, session.participants.challengerId],
      },
    };

    session.transcript.push(resolutionMessage);

    // Emit audit event
    this.emitAuditEvent({
      eventType: 'negotiation_aborted',
      negotiationId,
      turn: session.currentTurn,
      outcome: 'aborted',
      policyVerdict: 'DENY',
      timestamp: new Date().toISOString(),
    });

    return session;
  }

  // ==========================================================================
  // Policy Enforcement
  // ==========================================================================

  private async checkPreNegotiationPolicy(request: NegotiationRequest): Promise<GovernanceVerdict> {
    if (!this.config.enablePolicyChecks) {
      return this.createBypassVerdict();
    }

    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: request.tenantId,
      payload: {
        negotiationType: request.type,
        proposerId: request.proposerId,
        challengerId: request.challengerId,
        goal: request.initialProposal.goal,
      },
    };

    return this.policyEngine.check(context);
  }

  private async checkPerTurnPolicy(
    session: NegotiationSession,
    message: NegotiationMessage
  ): Promise<GovernanceVerdict> {
    if (!this.config.enablePolicyChecks) {
      return this.createBypassVerdict();
    }

    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: session.tenantId,
      payload: {
        negotiationId: session.negotiationId,
        turn: message.turn,
        messageType: message.type,
        role: message.role,
      },
    };

    return this.policyEngine.check(context);
  }

  private async checkPreResolutionPolicy(
    session: NegotiationSession,
    finalTerms: Record<string, any>
  ): Promise<GovernanceVerdict> {
    if (!this.config.enablePolicyChecks) {
      return this.createBypassVerdict();
    }

    const context: PolicyContext = {
      stage: 'runtime',
      tenantId: session.tenantId,
      payload: {
        negotiationId: session.negotiationId,
        negotiationType: session.type,
        finalTerms,
      },
    };

    return this.policyEngine.check(context);
  }

  private createBypassVerdict(): GovernanceVerdict {
    return {
      action: 'ALLOW',
      reasons: [],
      policyIds: [],
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: 'negotiation-runtime-bypass',
        latencyMs: 0,
        simulation: false,
      },
      provenance: {
        origin: 'negotiation-runtime',
        confidence: 1.0,
      },
    };
  }

  // ==========================================================================
  // Validation & Limits
  // ==========================================================================

  private normalizeLimits(limits?: Partial<NegotiationLimits>): NegotiationLimits {
    const normalized: NegotiationLimits = {
      ...this.config.defaultLimits,
      ...limits,
    };

    // Enforce maximum limits
    normalized.maxTurns = Math.min(normalized.maxTurns, MAX_LIMITS.maxTurns);
    normalized.maxCounterProposals = Math.min(
      normalized.maxCounterProposals,
      MAX_LIMITS.maxCounterProposals
    );
    normalized.maxChallenges = Math.min(normalized.maxChallenges, MAX_LIMITS.maxChallenges);
    normalized.maxConcurrentNegotiations = Math.min(
      normalized.maxConcurrentNegotiations,
      MAX_LIMITS.maxConcurrentNegotiations
    );
    normalized.perTurnTimeoutMs = Math.min(
      normalized.perTurnTimeoutMs,
      MAX_LIMITS.perTurnTimeoutMs
    );
    normalized.totalTimeoutMs = Math.min(normalized.totalTimeoutMs, MAX_LIMITS.totalTimeoutMs);
    normalized.approvalWindowMs = Math.min(
      normalized.approvalWindowMs,
      MAX_LIMITS.approvalWindowMs
    );

    return normalized;
  }

  private validateMessage(message: NegotiationMessage): void {
    if (!message.messageId || !message.negotiationId || !message.timestamp) {
      throw new NegotiationError('Message missing required fields', 'SCHEMA_VIOLATION');
    }

    // Role-specific validation
    if (message.role === 'proposer' && 'proposal' in message) {
      if (!message.proposal.goal || !message.proposal.terms) {
        throw new NegotiationError('Proposal missing goal or terms', 'SCHEMA_VIOLATION');
      }
    } else if (message.role === 'challenger' && 'challenge' in message) {
      if (!message.challenge.objections || message.challenge.objections.length === 0) {
        throw new NegotiationError('Challenge missing objections', 'SCHEMA_VIOLATION');
      }
    }
  }

  private checkTimeout(session: NegotiationSession): void {
    const now = Date.now();
    const totalElapsed = now - session.startTime;

    if (totalElapsed > session.limits.totalTimeoutMs) {
      throw new NegotiationError(
        `Total timeout exceeded: ${totalElapsed}ms > ${session.limits.totalTimeoutMs}ms`,
        'TIMEOUT'
      );
    }

    const sinceLastActivity = now - session.lastActivityTime;
    if (sinceLastActivity > session.limits.perTurnTimeoutMs) {
      throw new NegotiationError(
        `Per-turn timeout exceeded: ${sinceLastActivity}ms > ${session.limits.perTurnTimeoutMs}ms`,
        'TIMEOUT'
      );
    }
  }

  // ==========================================================================
  // Scoring
  // ==========================================================================

  private scoreProposals(session: NegotiationSession): ProposalScore[] {
    const proposals = session.transcript.filter(
      (m) => m.role === 'proposer'
    ) as ProposalMessage[];

    const scores: ProposalScore[] = proposals.map((proposal, index) => {
      // Simplified scoring (real implementation would be more sophisticated)
      const scores = {
        feasibility: 0.8,
        compliance: 0.9,
        costBenefit: 0.7,
        riskMitigation: 0.75,
        stakeholderAlignment: 0.85,
      };

      const totalScore =
        scores.feasibility * this.config.scoringWeights.feasibility +
        scores.compliance * this.config.scoringWeights.compliance +
        scores.costBenefit * this.config.scoringWeights.costBenefit +
        scores.riskMitigation * this.config.scoringWeights.riskMitigation +
        scores.stakeholderAlignment * this.config.scoringWeights.stakeholderAlignment;

      return {
        proposalId: proposal.messageId,
        scores,
        totalScore,
        rank: index + 1,
      };
    });

    // Sort by totalScore descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // Update ranks
    scores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return scores;
  }

  // ==========================================================================
  // Transcript Management
  // ==========================================================================

  public getTranscript(negotiationId: string): NegotiationMessage[] {
    const session = this.getSession(negotiationId);
    return [...session.transcript];
  }

  public getRedactedTranscript(negotiationId: string): RedactedTranscript {
    const session = this.getSession(negotiationId);

    const redactedMessages: RedactedMessage[] = session.transcript.map((msg) => ({
      messageId: msg.messageId,
      role: msg.role,
      type: msg.type,
      turn: msg.turn || 0,
      timestamp: msg.timestamp,
      summary: this.summarizeMessage(msg),
      sensitiveFieldsRedacted: ['evidence', 'terms'], // Example
    }));

    const hash = this.hashTranscript(session.transcript);

    return {
      negotiationId: session.negotiationId,
      participants: [
        session.participants.proposerId,
        session.participants.challengerId,
        session.participants.arbiterId || 'system',
      ],
      turnCount: session.currentTurn,
      outcome: session.outcome || 'in_progress',
      durationMs: (session.endTime || Date.now()) - session.startTime,
      messages: redactedMessages,
      hash,
    };
  }

  private summarizeMessage(message: NegotiationMessage): string {
    if (message.role === 'proposer' && 'proposal' in message) {
      return `Proposal: ${message.proposal.goal}`;
    } else if (message.role === 'challenger' && 'challenge' in message) {
      return `Challenge with ${message.challenge.objections.length} objections`;
    } else if (message.role === 'arbiter' && 'resolution' in message) {
      return `Resolution: ${message.resolution.outcome}`;
    }
    return 'Message';
  }

  private hashTranscript(transcript: NegotiationMessage[]): string {
    const concatenated = transcript.map((m) => m.messageId + m.timestamp).join('');
    return createHash('sha256').update(concatenated).digest('hex');
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  private getSession(negotiationId: string): NegotiationSession {
    const session = this.activeSessions.get(negotiationId);
    if (!session) {
      throw new NegotiationError(`Negotiation not found: ${negotiationId}`, 'INVALID_STATE');
    }
    return session;
  }

  public getActiveNegotiations(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  public closeSession(negotiationId: string): void {
    this.activeSessions.delete(negotiationId);
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private findLastProposal(session: NegotiationSession): ProposalMessage | undefined {
    const proposals = session.transcript.filter(
      (m) => m.role === 'proposer'
    ) as ProposalMessage[];
    return proposals[proposals.length - 1];
  }

  // ==========================================================================
  // Audit
  // ==========================================================================

  private emitAuditEvent(event: NegotiationAuditEvent): void {
    if (this.config.enableAuditLog) {
      this.auditEvents.push(event);
      this.emit('audit', event);
      logger.info('[NegotiationRuntime] Audit event', event);
    }
  }

  public getAuditEvents(): NegotiationAuditEvent[] {
    return [...this.auditEvents];
  }

  public clearAuditEvents(): void {
    this.auditEvents = [];
  }
}

// ============================================================================
// Factory
// ============================================================================

let runtimeInstance: NegotiationRuntime | null = null;

export function getNegotiationRuntime(
  config?: Partial<NegotiationRuntimeConfig>,
  policyEngine?: PolicyEngine
): NegotiationRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new NegotiationRuntime(config, policyEngine);
  }
  return runtimeInstance;
}
