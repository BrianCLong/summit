/**
 * Cross-Border Assistant Gateway
 *
 * Main service for managing cross-border virtual assistant interoperability,
 * providing a unified API for partner discovery, handover, and communication.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type {
  PartnerNation,
  CrossBorderSession,
  CrossBorderMessage,
  HandoverRequest,
  HandoverResponse,
  SessionContext,
  CrossBorderAuditEntry,
  DataClassification,
  PartnerHealth,
} from './types.js';
import { getPartnerRegistry, PartnerRegistry } from './partner-registry.js';
import { getHandoverProtocol, HandoverProtocol } from './handover-protocol.js';
import { getMultilingualBridge, MultilingualBridge } from './multilingual-bridge.js';

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  nodeId: string;
  region: string;
  defaultLanguage: string;
  maxConcurrentSessions: number;
  auditEnabled: boolean;
  encryptionEnabled: boolean;
}

const DEFAULT_CONFIG: GatewayConfig = {
  nodeId: 'intelgraph-primary',
  region: 'US',
  defaultLanguage: 'en',
  maxConcurrentSessions: 1000,
  auditEnabled: true,
  encryptionEnabled: true,
};

/**
 * Cross-Border Assistant Gateway
 *
 * Central orchestrator for the Bürokratt-style cross-border
 * assistant interoperability network.
 */
export class CrossBorderGateway extends EventEmitter {
  private config: GatewayConfig;
  private registry: PartnerRegistry;
  private handover: HandoverProtocol;
  private translator: MultilingualBridge;
  private auditLog: CrossBorderAuditEntry[] = [];
  private messageQueues: Map<string, CrossBorderMessage[]> = new Map();

  constructor(config: Partial<GatewayConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = getPartnerRegistry();
    this.handover = getHandoverProtocol();
    this.translator = getMultilingualBridge();

    this.setupEventHandlers();
  }

  /**
   * Initialize the gateway
   */
  async initialize(): Promise<void> {
    await this.registry.initialize();
    this.emit('initialized');
    this.audit('gateway_initialized', {
      nodeId: this.config.nodeId,
      region: this.config.region,
    });
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    this.registry.on('partnerStatusChanged', (data) => {
      this.emit('partnerStatusChanged', data);
      this.audit('partner_status_changed', data);
    });

    this.handover.on('handoverComplete', (data) => {
      this.emit('handoverComplete', data);
    });

    this.handover.on('stateChanged', (data) => {
      this.emit('sessionStateChanged', data);
    });
  }

  // ==================== Partner Management ====================

  /**
   * Get all registered partners
   */
  getPartners(): PartnerNation[] {
    return this.registry.getActivePartners();
  }

  /**
   * Get partner by country code
   */
  getPartner(code: string): PartnerNation | undefined {
    return this.registry.getPartner(code);
  }

  /**
   * Find partners that can handle a specific domain
   */
  findPartnersByDomain(domain: string): PartnerNation[] {
    return this.registry.getPartnersByDomain(domain);
  }

  /**
   * Find partners that support a specific language
   */
  findPartnersByLanguage(language: string): PartnerNation[] {
    return this.registry.getPartnersByLanguage(language);
  }

  /**
   * Get partner health status
   */
  getPartnerHealth(code: string): PartnerHealth | undefined {
    return this.registry.getHealthStatus(code);
  }

  /**
   * Find best partner for a request
   */
  findBestPartner(criteria: {
    domain: string;
    language?: string;
    classification?: DataClassification;
  }): PartnerNation | null {
    return this.registry.findBestPartner(criteria);
  }

  // ==================== Session Management ====================

  /**
   * Create a new cross-border session
   */
  async createSession(params: {
    targetNation: string;
    intent: string;
    language: string;
    context?: Partial<SessionContext>;
  }): Promise<CrossBorderSession> {
    const targetPartner = this.registry.getPartner(params.targetNation);
    if (!targetPartner) {
      throw new Error(`Unknown partner nation: ${params.targetNation}`);
    }

    const sessionContext: SessionContext = {
      conversationId: randomUUID(),
      language: params.language,
      targetLanguage: targetPartner.languages[0],
      intent: params.intent,
      entities: [],
      summary: '',
      metadata: {},
      dataClassification: 'internal',
      retentionPolicy: {
        maxDurationHours: 24,
        deleteOnCompletion: true,
        auditRetentionDays: 90,
        allowedRegions: [this.config.region, targetPartner.region],
      },
      ...params.context,
    };

    const request: HandoverRequest = {
      sessionId: randomUUID(),
      sourceNation: this.config.region,
      targetNation: params.targetNation,
      context: sessionContext,
      priority: 'normal',
      timeoutMs: 30000,
    };

    const response = await this.handover.initiateHandover(request);

    if (!response.accepted) {
      throw new Error(`Session creation rejected: ${response.rejectionReason}`);
    }

    const session = this.handover.getSession(request.sessionId);
    if (!session) {
      throw new Error('Session creation failed');
    }

    this.messageQueues.set(session.id, []);
    this.audit('session_created', {
      sessionId: session.id,
      targetNation: params.targetNation,
    });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CrossBorderSession | undefined {
    return this.handover.getSession(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CrossBorderSession[] {
    return this.handover.getActiveSessions();
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<void> {
    await this.handover.completeSession(sessionId);
    this.messageQueues.delete(sessionId);
    this.audit('session_completed', { sessionId });
  }

  // ==================== Messaging ====================

  /**
   * Send a message in a cross-border session
   */
  async sendMessage(
    sessionId: string,
    content: string,
    options: {
      translate?: boolean;
      targetLanguage?: string;
    } = {}
  ): Promise<CrossBorderMessage> {
    const session = this.handover.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Detect source language
    const detection = await this.translator.detectLanguage(content);

    let message: CrossBorderMessage = {
      id: randomUUID(),
      sessionId,
      type: 'user',
      content,
      language: detection.language,
      timestamp: new Date(),
      metadata: {
        sourceNation: this.config.region,
        confidence: detection.confidence,
        encrypted: this.config.encryptionEnabled,
      },
    };

    // Translate if needed
    if (options.translate && options.targetLanguage) {
      message = await this.translator.translateMessage(message, options.targetLanguage);
    }

    // Queue message
    const queue = this.messageQueues.get(sessionId);
    if (queue) {
      queue.push(message);
    }

    this.emit('messageSent', message);
    return message;
  }

  /**
   * Get messages for a session
   */
  getMessages(sessionId: string): CrossBorderMessage[] {
    return this.messageQueues.get(sessionId) || [];
  }

  // ==================== Handover ====================

  /**
   * Initiate handover to another partner
   */
  async initiateHandover(
    sessionId: string,
    targetNation: string,
    reason: string
  ): Promise<HandoverResponse> {
    const session = this.handover.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const request: HandoverRequest = {
      sessionId,
      sourceNation: session.targetNation,
      targetNation,
      context: {
        ...session.context,
        summary: `Handover from ${session.targetNation}: ${reason}`,
      },
      priority: 'normal',
      timeoutMs: 30000,
    };

    const response = await this.handover.initiateHandover(request);

    this.audit('handover_initiated', {
      sessionId,
      fromNation: session.targetNation,
      toNation: targetNation,
      accepted: response.accepted,
    });

    return response;
  }

  /**
   * Accept an incoming handover
   */
  async acceptHandover(request: HandoverRequest): Promise<HandoverResponse> {
    const response = await this.handover.acceptHandover(request);

    this.audit('handover_accepted', {
      sessionId: request.sessionId,
      sourceNation: request.sourceNation,
      accepted: response.accepted,
    });

    return response;
  }

  // ==================== Translation ====================

  /**
   * Translate text
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const result = await this.translator.translate({
      text,
      sourceLanguage,
      targetLanguage,
    });
    return result.translatedText;
  }

  /**
   * Detect language
   */
  async detectLanguage(text: string) {
    return this.translator.detectLanguage(text);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.translator.getSupportedLanguages();
  }

  // ==================== Audit ====================

  /**
   * Create audit entry
   */
  private audit(
    operation: string,
    details: Record<string, unknown>
  ): void {
    if (!this.config.auditEnabled) return;

    const entry: CrossBorderAuditEntry = {
      id: randomUUID(),
      timestamp: new Date(),
      operation,
      sourceNation: this.config.region,
      targetNation: (details.targetNation as string) || '',
      sessionId: details.sessionId as string | undefined,
      dataClassification: 'internal',
      success: true,
      details,
    };

    this.auditLog.push(entry);
    this.emit('audit', entry);

    // Keep only last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(filter?: {
    operation?: string;
    sessionId?: string;
    since?: Date;
  }): CrossBorderAuditEntry[] {
    let entries = this.auditLog;

    if (filter?.operation) {
      entries = entries.filter((e) => e.operation === filter.operation);
    }
    if (filter?.sessionId) {
      entries = entries.filter((e) => e.sessionId === filter.sessionId);
    }
    if (filter?.since) {
      entries = entries.filter((e) => e.timestamp >= filter.since);
    }

    return entries;
  }

  // ==================== Lifecycle ====================

  /**
   * Shutdown the gateway
   */
  async shutdown(): Promise<void> {
    await this.registry.shutdown();
    this.messageQueues.clear();
    this.emit('shutdown');
  }

  /**
   * Get gateway status
   */
  getStatus() {
    return {
      nodeId: this.config.nodeId,
      region: this.config.region,
      activePartners: this.registry.getActivePartners().length,
      activeSessions: this.handover.getActiveSessions().length,
      supportedLanguages: this.translator.getSupportedLanguages().length,
      auditEntries: this.auditLog.length,
    };
  }
}

// Singleton
let gatewayInstance: CrossBorderGateway | null = null;

export function getCrossBorderGateway(
  config?: Partial<GatewayConfig>
): CrossBorderGateway {
  if (!gatewayInstance) {
    gatewayInstance = new CrossBorderGateway(config);
  }
  return gatewayInstance;
}

export { CrossBorderGateway };
