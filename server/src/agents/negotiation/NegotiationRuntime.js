"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationRuntime = void 0;
exports.getNegotiationRuntime = getNegotiationRuntime;
const uuid_1 = require("uuid");
const events_1 = require("events");
const crypto_1 = require("crypto");
const PolicyEngine_js_1 = require("../../governance/PolicyEngine.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const types_js_1 = require("./types.js");
const DEFAULT_CONFIG = {
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
    scoringWeights: types_js_1.DEFAULT_SCORING_WEIGHTS,
};
const MAX_LIMITS = {
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
class NegotiationRuntime extends events_1.EventEmitter {
    config;
    policyEngine;
    activeSessions;
    auditEvents;
    constructor(config, policyEngine) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.policyEngine = policyEngine || new PolicyEngine_js_1.PolicyEngine();
        this.activeSessions = new Map();
        this.auditEvents = [];
        logger_js_1.default.info('[NegotiationRuntime] Initialized with policy enforcement');
    }
    // ==========================================================================
    // Negotiation Lifecycle
    // ==========================================================================
    /**
     * Initiate a new negotiation.
     */
    async initiate(request) {
        logger_js_1.default.info('[NegotiationRuntime] Initiating negotiation', {
            type: request.type,
            tenantId: request.tenantId,
        });
        // Step 1: Pre-negotiation policy check
        const verdict = await this.checkPreNegotiationPolicy(request);
        if (verdict.action === 'DENY') {
            throw new types_js_1.NegotiationError(`Policy denied negotiation: ${verdict.reasons.join(', ')}`, 'POLICY_DENIED', { verdict });
        }
        // Step 2: Create session
        const negotiationId = (0, uuid_1.v4)();
        const limits = this.normalizeLimits(request.limits);
        const session = {
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
        const initialMessage = {
            messageId: (0, uuid_1.v4)(),
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
        logger_js_1.default.info(`[NegotiationRuntime] Negotiation ${negotiationId} initiated`);
        return session;
    }
    /**
     * Submit a message to an ongoing negotiation.
     */
    async submitMessage(negotiationId, message) {
        const session = this.getSession(negotiationId);
        // Check state
        if (session.state === 'CLOSED' || session.state === 'ABORTED') {
            throw new types_js_1.NegotiationError(`Cannot submit message: negotiation is ${session.state}`, 'INVALID_STATE');
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
        const fullMessage = {
            ...message,
            messageId: (0, uuid_1.v4)(),
            negotiationId,
            timestamp: new Date().toISOString(),
            turn: session.currentTurn,
        };
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
            agentId: fullMessage.metadata?.agentId,
            role: fullMessage.role,
            policyVerdict: verdict.action,
            timestamp: new Date().toISOString(),
        });
        logger_js_1.default.info(`[NegotiationRuntime] Turn ${session.currentTurn} in ${negotiationId}`);
        return session;
    }
    /**
     * Resolve a negotiation.
     */
    async resolve(negotiationId, outcome, rationale) {
        const session = this.getSession(negotiationId);
        logger_js_1.default.info(`[NegotiationRuntime] Resolving ${negotiationId} with outcome: ${outcome}`);
        // Determine final terms
        let finalTerms;
        if (outcome === 'agreement') {
            // Find last accepted proposal
            const lastProposal = this.findLastProposal(session);
            finalTerms = lastProposal?.proposal.terms;
        }
        else if (outcome === 'disagreement') {
            // Score proposals and recommend highest
            const scored = this.scoreProposals(session);
            if (scored.length > 0) {
                const highestScored = scored[0];
                const proposal = session.transcript.find((m) => m.messageId === highestScored.proposalId);
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
        const resolutionMessage = {
            messageId: (0, uuid_1.v4)(),
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
    async approve(negotiationId, decision, approverIdentity, remarks, conditions) {
        const session = this.getSession(negotiationId);
        if (session.state !== 'APPROVAL') {
            throw new types_js_1.NegotiationError('Can only approve negotiations in APPROVAL state', 'INVALID_STATE');
        }
        const approvalMessage = {
            messageId: (0, uuid_1.v4)(),
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
        logger_js_1.default.info(`[NegotiationRuntime] Negotiation ${negotiationId} ${decision}`);
        return session;
    }
    /**
     * Abort a negotiation.
     */
    async abort(negotiationId, reason) {
        const session = this.getSession(negotiationId);
        logger_js_1.default.warn(`[NegotiationRuntime] Aborting ${negotiationId}: ${reason}`);
        session.state = 'ABORTED';
        session.outcome = 'aborted';
        session.abortReason = reason;
        session.endTime = Date.now();
        // Create resolution message
        const resolutionMessage = {
            messageId: (0, uuid_1.v4)(),
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
    async checkPreNegotiationPolicy(request) {
        if (!this.config.enablePolicyChecks) {
            return this.createBypassVerdict();
        }
        const context = {
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
    async checkPerTurnPolicy(session, message) {
        if (!this.config.enablePolicyChecks) {
            return this.createBypassVerdict();
        }
        const context = {
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
    async checkPreResolutionPolicy(session, finalTerms) {
        if (!this.config.enablePolicyChecks) {
            return this.createBypassVerdict();
        }
        const context = {
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
    createBypassVerdict() {
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
    normalizeLimits(limits) {
        const normalized = {
            ...this.config.defaultLimits,
            ...limits,
        };
        // Enforce maximum limits
        normalized.maxTurns = Math.min(normalized.maxTurns, MAX_LIMITS.maxTurns);
        normalized.maxCounterProposals = Math.min(normalized.maxCounterProposals, MAX_LIMITS.maxCounterProposals);
        normalized.maxChallenges = Math.min(normalized.maxChallenges, MAX_LIMITS.maxChallenges);
        normalized.maxConcurrentNegotiations = Math.min(normalized.maxConcurrentNegotiations, MAX_LIMITS.maxConcurrentNegotiations);
        normalized.perTurnTimeoutMs = Math.min(normalized.perTurnTimeoutMs, MAX_LIMITS.perTurnTimeoutMs);
        normalized.totalTimeoutMs = Math.min(normalized.totalTimeoutMs, MAX_LIMITS.totalTimeoutMs);
        normalized.approvalWindowMs = Math.min(normalized.approvalWindowMs, MAX_LIMITS.approvalWindowMs);
        return normalized;
    }
    validateMessage(message) {
        if (!message.messageId || !message.negotiationId || !message.timestamp) {
            throw new types_js_1.NegotiationError('Message missing required fields', 'SCHEMA_VIOLATION');
        }
        // Role-specific validation
        if (message.role === 'proposer' && 'proposal' in message) {
            if (!message.proposal.goal || !message.proposal.terms) {
                throw new types_js_1.NegotiationError('Proposal missing goal or terms', 'SCHEMA_VIOLATION');
            }
        }
        else if (message.role === 'challenger' && 'challenge' in message) {
            if (!message.challenge.objections || message.challenge.objections.length === 0) {
                throw new types_js_1.NegotiationError('Challenge missing objections', 'SCHEMA_VIOLATION');
            }
        }
    }
    checkTimeout(session) {
        const now = Date.now();
        const totalElapsed = now - session.startTime;
        if (totalElapsed > session.limits.totalTimeoutMs) {
            throw new types_js_1.NegotiationError(`Total timeout exceeded: ${totalElapsed}ms > ${session.limits.totalTimeoutMs}ms`, 'TIMEOUT');
        }
        const sinceLastActivity = now - session.lastActivityTime;
        if (sinceLastActivity > session.limits.perTurnTimeoutMs) {
            throw new types_js_1.NegotiationError(`Per-turn timeout exceeded: ${sinceLastActivity}ms > ${session.limits.perTurnTimeoutMs}ms`, 'TIMEOUT');
        }
    }
    // ==========================================================================
    // Scoring
    // ==========================================================================
    scoreProposals(session) {
        const proposals = session.transcript.filter((m) => m.role === 'proposer');
        const scores = proposals.map((proposal, index) => {
            // Simplified scoring (real implementation would be more sophisticated)
            const scores = {
                feasibility: 0.8,
                compliance: 0.9,
                costBenefit: 0.7,
                riskMitigation: 0.75,
                stakeholderAlignment: 0.85,
            };
            const totalScore = scores.feasibility * this.config.scoringWeights.feasibility +
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
    getTranscript(negotiationId) {
        const session = this.getSession(negotiationId);
        return [...session.transcript];
    }
    getRedactedTranscript(negotiationId) {
        const session = this.getSession(negotiationId);
        const redactedMessages = session.transcript.map((msg) => ({
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
    summarizeMessage(message) {
        if (message.role === 'proposer' && 'proposal' in message) {
            return `Proposal: ${message.proposal.goal}`;
        }
        else if (message.role === 'challenger' && 'challenge' in message) {
            return `Challenge with ${message.challenge.objections.length} objections`;
        }
        else if (message.role === 'arbiter' && 'resolution' in message) {
            return `Resolution: ${message.resolution.outcome}`;
        }
        return 'Message';
    }
    hashTranscript(transcript) {
        const concatenated = transcript.map((m) => m.messageId + m.timestamp).join('');
        return (0, crypto_1.createHash)('sha256').update(concatenated).digest('hex');
    }
    // ==========================================================================
    // Session Management
    // ==========================================================================
    getSession(negotiationId) {
        const session = this.activeSessions.get(negotiationId);
        if (!session) {
            throw new types_js_1.NegotiationError(`Negotiation not found: ${negotiationId}`, 'INVALID_STATE');
        }
        return session;
    }
    getActiveNegotiations() {
        return Array.from(this.activeSessions.keys());
    }
    closeSession(negotiationId) {
        this.activeSessions.delete(negotiationId);
    }
    // ==========================================================================
    // Utilities
    // ==========================================================================
    findLastProposal(session) {
        const proposals = session.transcript.filter((m) => m.role === 'proposer');
        return proposals[proposals.length - 1];
    }
    // ==========================================================================
    // Audit
    // ==========================================================================
    emitAuditEvent(event) {
        if (this.config.enableAuditLog) {
            this.auditEvents.push(event);
            this.emit('audit', event);
            logger_js_1.default.info('[NegotiationRuntime] Audit event', event);
        }
    }
    getAuditEvents() {
        return [...this.auditEvents];
    }
    clearAuditEvents() {
        this.auditEvents = [];
    }
}
exports.NegotiationRuntime = NegotiationRuntime;
// ============================================================================
// Factory
// ============================================================================
let runtimeInstance = null;
function getNegotiationRuntime(config, policyEngine) {
    if (!runtimeInstance) {
        runtimeInstance = new NegotiationRuntime(config, policyEngine);
    }
    return runtimeInstance;
}
