/**
 * Cross-Border Handover Protocol
 *
 * Implements adaptive handover protocols for seamless session transfer
 * between government virtual assistants across nations.
 */

import { EventEmitter } from 'events';
import { createHash, randomUUID } from 'crypto';
import type {
  CrossBorderSession,
  HandoverRequest,
  HandoverResponse,
  HandoverState,
  HandoverRecord,
  SessionContext,
  DataClassification,
  ContextEntity,
} from './types.js';
import { getPartnerRegistry, PartnerRegistry } from './partner-registry.js';

/**
 * Configuration for handover protocol
 */
export interface HandoverConfig {
  defaultTimeoutMs: number;
  maxRetries: number;
  contextSizeLimit: number;
  enableEncryption: boolean;
  auditAllHandovers: boolean;
}

const DEFAULT_CONFIG: HandoverConfig = {
  defaultTimeoutMs: 30000,
  maxRetries: 3,
  contextSizeLimit: 32000,
  enableEncryption: true,
  auditAllHandovers: true,
};

/**
 * Sensitive field patterns for redaction
 */
const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{11}\b/, // National ID (Estonian)
  /\b[A-Z]{2}\d{6,8}\b/i, // Passport
  /\b\d{16}\b/, // Credit card
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
];

/**
 * Handover Protocol Service
 *
 * Manages cross-border session handovers with context preservation,
 * security controls, and audit logging.
 */
export class HandoverProtocol extends EventEmitter {
  private sessions: Map<string, CrossBorderSession> = new Map();
  private config: HandoverConfig;
  private registry: PartnerRegistry;

  constructor(config: Partial<HandoverConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = getPartnerRegistry();
  }

  /**
   * Initiate a handover to another nation's assistant
   */
  async initiateHandover(request: HandoverRequest): Promise<HandoverResponse> {
    const sourcePartner = this.registry.getPartner(request.sourceNation);
    const targetPartner = this.registry.getPartner(request.targetNation);

    // Validate partners
    if (!sourcePartner) {
      throw new Error(`Unknown source nation: ${request.sourceNation}`);
    }
    if (!targetPartner) {
      throw new Error(`Unknown target nation: ${request.targetNation}`);
    }
    if (targetPartner.status !== 'active') {
      return {
        sessionId: request.sessionId,
        accepted: false,
        rejectionReason: `Target nation ${request.targetNation} is not active`,
      };
    }

    // Validate data classification
    if (
      !this.registry.canHandleClassification(
        request.targetNation,
        request.context.dataClassification
      )
    ) {
      return {
        sessionId: request.sessionId,
        accepted: false,
        rejectionReason: `Target nation cannot handle ${request.context.dataClassification} data`,
      };
    }

    // Create session
    const session = this.createSession(request);
    this.sessions.set(session.id, session);

    // Prepare context for transfer
    const sanitizedContext = await this.prepareContextForTransfer(
      request.context,
      targetPartner.trustLevel.maxDataClassification
    );

    // Attempt handover
    try {
      await this.updateSessionState(session.id, 'context_transfer');

      const response = await this.sendHandoverRequest(
        targetPartner.endpoint.baseUrl,
        {
          ...request,
          context: sanitizedContext,
        }
      );

      if (response.accepted) {
        await this.updateSessionState(session.id, 'accepted');
        this.recordHandover(session, 'success');
      } else {
        await this.updateSessionState(session.id, 'failed');
        this.recordHandover(session, 'failed');
      }

      this.emit('handoverComplete', { session, response });
      return response;
    } catch (error) {
      await this.updateSessionState(session.id, 'failed');
      this.recordHandover(session, 'failed');
      throw error;
    }
  }

  /**
   * Accept an incoming handover request
   */
  async acceptHandover(request: HandoverRequest): Promise<HandoverResponse> {
    // Validate request
    const sourcePartner = this.registry.getPartner(request.sourceNation);
    if (!sourcePartner || sourcePartner.status !== 'active') {
      return {
        sessionId: request.sessionId,
        accepted: false,
        rejectionReason: 'Source nation not recognized or inactive',
      };
    }

    // Validate context size
    const contextSize = JSON.stringify(request.context).length;
    if (contextSize > this.config.contextSizeLimit) {
      return {
        sessionId: request.sessionId,
        accepted: false,
        rejectionReason: `Context size ${contextSize} exceeds limit ${this.config.contextSizeLimit}`,
      };
    }

    // Create local session
    const session = this.createSession(request);
    session.state = 'in_progress';
    this.sessions.set(session.id, session);

    this.emit('handoverAccepted', session);

    return {
      sessionId: request.sessionId,
      accepted: true,
      targetSessionId: session.id,
      estimatedWaitMs: 0,
      capabilities: this.getLocalCapabilities(),
    };
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CrossBorderSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CrossBorderSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.state !== 'completed' && s.state !== 'failed'
    );
  }

  /**
   * Complete a handover session
   */
  async completeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.updateSessionState(sessionId, 'completed');
    this.emit('sessionCompleted', session);

    // Apply retention policy
    if (session.context.retentionPolicy.deleteOnCompletion) {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Rollback a failed handover
   */
  async rollbackHandover(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.updateSessionState(sessionId, 'rolled_back');
    this.emit('handoverRolledBack', session);
  }

  /**
   * Create a new cross-border session
   */
  private createSession(request: HandoverRequest): CrossBorderSession {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (request.context.retentionPolicy.maxDurationHours * 60 * 60 * 1000)
    );

    return {
      id: `cbs_${randomUUID()}`,
      originNation: request.sourceNation,
      targetNation: request.targetNation,
      state: 'initiated',
      context: request.context,
      handoverChain: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };
  }

  /**
   * Update session state
   */
  private async updateSessionState(
    sessionId: string,
    state: HandoverState
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = state;
      session.updatedAt = new Date();
      this.emit('stateChanged', { sessionId, state });
    }
  }

  /**
   * Record a handover attempt
   */
  private recordHandover(
    session: CrossBorderSession,
    status: 'success' | 'failed' | 'timeout'
  ): void {
    const record: HandoverRecord = {
      id: randomUUID(),
      fromNation: session.originNation,
      toNation: session.targetNation,
      timestamp: new Date(),
      reason: session.context.intent,
      status,
      durationMs: Date.now() - session.createdAt.getTime(),
      contextHash: this.hashContext(session.context),
    };

    session.handoverChain.push(record);
  }

  /**
   * Prepare context for cross-border transfer
   */
  private async prepareContextForTransfer(
    context: SessionContext,
    maxClassification: DataClassification
  ): Promise<SessionContext> {
    const sanitizedContext = { ...context };

    // Redact entities based on classification
    sanitizedContext.entities = this.sanitizeEntities(
      context.entities,
      maxClassification
    );

    // Redact sensitive patterns from summary
    sanitizedContext.summary = this.redactSensitiveData(context.summary);

    // Filter metadata
    sanitizedContext.metadata = this.filterMetadata(context.metadata);

    return sanitizedContext;
  }

  /**
   * Sanitize entities based on target classification level
   */
  private sanitizeEntities(
    entities: ContextEntity[],
    maxClassification: DataClassification
  ): ContextEntity[] {
    const sensitiveTypes = ['ssn', 'passport', 'tax_id', 'bank_account'];

    return entities.map((entity) => {
      if (sensitiveTypes.includes(entity.type.toLowerCase())) {
        return {
          ...entity,
          value: '[REDACTED]',
          redacted: true,
        };
      }
      return entity;
    });
  }

  /**
   * Redact sensitive data patterns from text
   */
  private redactSensitiveData(text: string): string {
    let result = text;
    for (const pattern of SENSITIVE_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  /**
   * Filter metadata for cross-border transfer
   */
  private filterMetadata(
    metadata: Record<string, unknown>
  ): Record<string, unknown> {
    const allowedKeys = [
      'domain',
      'intent',
      'language',
      'timestamp',
      'version',
    ];
    const filtered: Record<string, unknown> = {};

    for (const key of allowedKeys) {
      if (key in metadata) {
        filtered[key] = metadata[key];
      }
    }

    return filtered;
  }

  /**
   * Generate hash of context for verification
   */
  private hashContext(context: SessionContext): string {
    const data = JSON.stringify({
      conversationId: context.conversationId,
      intent: context.intent,
      summary: context.summary,
    });
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  /**
   * Send handover request to target endpoint
   */
  private async sendHandoverRequest(
    baseUrl: string,
    request: HandoverRequest
  ): Promise<HandoverResponse> {
    const response = await fetch(`${baseUrl}/handover/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Handover-Version': '1.0',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(request.timeoutMs || this.config.defaultTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Handover request failed: ${response.status}`);
    }

    return response.json() as Promise<HandoverResponse>;
  }

  /**
   * Get local assistant capabilities
   */
  private getLocalCapabilities() {
    return {
      domains: ['intelligence', 'analysis', 'investigation'],
      operations: ['query', 'analyze', 'collaborate'],
      maxContextSize: this.config.contextSizeLimit,
      supportsStreaming: true,
      supportsMultimodal: true,
      responseTimeMs: 1000,
    };
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton
let protocolInstance: HandoverProtocol | null = null;

export function getHandoverProtocol(
  config?: Partial<HandoverConfig>
): HandoverProtocol {
  if (!protocolInstance) {
    protocolInstance = new HandoverProtocol(config);
  }
  return protocolInstance;
}
