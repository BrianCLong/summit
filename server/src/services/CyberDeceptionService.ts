
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { BehavioralFingerprintService, BehavioralTelemetry } from './BehavioralFingerprintService.js';
import { ProvenanceLedgerV2 } from '../provenance/ledger.js';
import logger from '../utils/logger.js';
import { EventEmitter } from 'events';

export interface HoneypotConfig {
  name: string;
  type: 'SSH' | 'HTTP' | 'DATABASE' | 'CUSTOM';
  location: string;
  metadata?: Record<string, any>;
}

export interface Honeypot {
  id: string;
  config: HoneypotConfig;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPROMISED';
  deployedAt: Date;
}

export interface HoneyTokenConfig {
  type: 'API_KEY' | 'USER_CREDENTIAL' | 'FILE_MARKER' | 'DB_RECORD';
  context: string;
  metadata?: Record<string, any>;
}

export interface HoneyToken {
  id: string;
  tokenValue: string;
  config: HoneyTokenConfig;
  createdAt: Date;
}

export interface DeceptionEvent {
  id: string;
  type: 'HONEYPOT_TRIGGER' | 'TOKEN_USE' | 'BREADCRUMB_FOLLOW';
  sourceIp: string;
  targetId: string;
  timestamp: Date;
  metadata: Record<string, any>;
  attribution?: any;
}

/**
 * Cyber Deception Service
 *
 * Manages distributed honeypots, honeytokens, and deception events.
 * Integrates with BehavioralFingerprintService for attribution and
 * ProvenanceLedgerV2 for audit trails.
 */
export class CyberDeceptionService extends EventEmitter {
  private static instance: CyberDeceptionService;
  // In-memory cache of active assets (persisted via ledger for audit)
  private honeypots: Map<string, Honeypot> = new Map();
  // Map hashed token values to token objects for secure lookups
  private honeyTokens: Map<string, HoneyToken> = new Map();

  // Use a capped buffer for recent events to avoid memory leaks
  private recentEvents: DeceptionEvent[] = [];
  private readonly MAX_RECENT_EVENTS = 1000;

  private fingerprintService: BehavioralFingerprintService;
  private provenanceLedger: ProvenanceLedgerV2;

  private constructor() {
    super();
    this.fingerprintService = new BehavioralFingerprintService();
    this.provenanceLedger = new ProvenanceLedgerV2();
    this.rehydrateState().catch(err => logger.error('Failed to rehydrate deception state', err));
  }

  public static getInstance(): CyberDeceptionService {
    if (!CyberDeceptionService.instance) {
      CyberDeceptionService.instance = new CyberDeceptionService();
    }
    return CyberDeceptionService.instance;
  }

  /**
   * Rehydrate in-memory state from the persistent ledger on startup.
   * This ensures honeypots and tokens survive restarts.
   */
  private async rehydrateState() {
    try {
      // Rehydrate Honeypots
      const hpEntries = await this.provenanceLedger.getEntries('system', {
        actionType: 'HONEYPOT_REGISTER',
        limit: 1000 // Reasonable limit for MVP
      });

      for (const entry of hpEntries) {
        if (entry.resourceId && entry.payload) {
          const honeypot: Honeypot = {
            id: entry.resourceId,
            config: entry.payload as HoneypotConfig,
            status: 'ACTIVE', // Default to active for now
            deployedAt: new Date(entry.timestamp)
          };
          this.honeypots.set(honeypot.id, honeypot);
        }
      }

      // Rehydrate Tokens
      const tokenEntries = await this.provenanceLedger.getEntries('system', {
        actionType: 'HONEYTOKEN_GENERATE',
        limit: 1000
      });

      for (const entry of tokenEntries) {
        if (entry.resourceId && entry.payload) {
          const payload = entry.payload as any;
          if (payload.tokenHash) {
             const token: HoneyToken = {
              id: entry.resourceId,
              tokenValue: 'REDACTED', // We don't have the raw value, but we can match hashes
              config: {
                type: payload.type,
                context: payload.context
              },
              createdAt: new Date(entry.timestamp)
            };
            this.honeyTokens.set(payload.tokenHash, token);
          }
        }
      }

      logger.info(`Rehydrated ${this.honeypots.size} honeypots and ${this.honeyTokens.size} tokens from ledger.`);
    } catch (error) {
      logger.error('Error rehydrating deception state:', error);
    }
  }

  /**
   * Register a new distributed honeypot
   */
  public async registerHoneypot(config: HoneypotConfig): Promise<Honeypot> {
    const id = uuidv4();
    const honeypot: Honeypot = {
      id,
      config,
      status: 'ACTIVE',
      deployedAt: new Date(),
    };
    this.honeypots.set(id, honeypot);

    // Log registration to provenance ledger
    await this.provenanceLedger.appendEntry({
      tenantId: 'system', // Default tenant for now
      actionType: 'HONEYPOT_REGISTER',
      resourceType: 'honeypot',
      resourceId: id,
      actorId: 'system-admin', // Should come from context
      actorType: 'system',
      payload: config,
      metadata: { timestamp: new Date() }
    }).catch(err => logger.error(`Failed to log honeypot registration: ${err.message}`));

    logger.info(`Registered honeypot: ${id} (${config.type})`);
    return honeypot;
  }

  /**
   * Generate a new deception token (Honeytoken)
   */
  public async generateHoneyToken(config: HoneyTokenConfig): Promise<HoneyToken> {
    const id = uuidv4();
    const tokenValue = this.generateTokenString(config.type);
    const tokenHash = this.hashToken(tokenValue);

    const token: HoneyToken = {
      id,
      tokenValue,
      config,
      createdAt: new Date(),
    };
    // Store by hash for secure lookup
    this.honeyTokens.set(tokenHash, token);

    await this.provenanceLedger.appendEntry({
      tenantId: 'system',
      actionType: 'HONEYTOKEN_GENERATE',
      resourceType: 'honeytoken',
      resourceId: id,
      actorId: 'system-admin',
      actorType: 'system',
      payload: {
        type: config.type,
        context: config.context,
        tokenHash // Persist hash for rehydration
      },
      metadata: { timestamp: new Date() }
    }).catch(err => logger.error(`Failed to log token generation: ${err.message}`));

    logger.info(`Generated honeytoken: ${id} (${config.type})`);
    return token;
  }

  /**
   * Record a deception event (interaction with honeypot or token)
   */
  public async recordInteraction(
    type: 'HONEYPOT_TRIGGER' | 'TOKEN_USE' | 'BREADCRUMB_FOLLOW',
    targetId: string, // For tokens, this is the token value
    sourceIp: string,
    metadata: Record<string, any> = {}
  ): Promise<DeceptionEvent> {

    let verifiedTargetId = targetId;
    let resourceType = 'unknown';

    if (type === 'TOKEN_USE') {
      resourceType = 'honeytoken';
      // Hash incoming token value to lookup
      const tokenHash = this.hashToken(targetId);
      const token = this.honeyTokens.get(tokenHash);

      if (!token) {
        logger.warn(`Interaction with unknown token: ${targetId}`);
        // We still record it
      } else {
        verifiedTargetId = token.id;
      }
    } else if (type === 'HONEYPOT_TRIGGER') {
      resourceType = 'honeypot';
      if (!this.honeypots.has(targetId)) {
        logger.warn(`Interaction with unknown honeypot: ${targetId}`);
      }
    }

    // Behavioral Fingerprinting
    const telemetry: BehavioralTelemetry = {
      clicks: metadata.clicks || 0,
      timeInView: metadata.duration || 0,
      editRate: metadata.keystrokes || 0,
    };

    const fingerprint = this.fingerprintService.computeFingerprint([telemetry]);
    const fingerprintScore = this.fingerprintService.scoreFingerprint(fingerprint);

    const event: DeceptionEvent = {
      id: uuidv4(),
      type,
      sourceIp,
      targetId: verifiedTargetId,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        fingerprint,
        fingerprintScore
      },
      attribution: {
        score: fingerprintScore,
        confidence: fingerprintScore > 0.8 ? 'HIGH' : 'LOW'
      }
    };

    // Store in ring buffer to prevent memory leak
    this.addEvent(event);

    this.emit('deception_event', event);

    // Log to provenance ledger for persistent audit trail
    await this.provenanceLedger.appendEntry({
      tenantId: 'system',
      actionType: 'DECEPTION_EVENT',
      resourceType: resourceType,
      resourceId: verifiedTargetId,
      actorId: sourceIp, // Actor is the source IP in this context
      actorType: 'external',
      payload: {
        type: event.type,
        attribution: event.attribution
      },
      metadata: {
        ipAddress: sourceIp,
        fingerprintScore,
        timestamp: new Date()
      }
    }).catch(err => logger.error(`Failed to log deception event: ${err.message}`));

    logger.info(`Deception event recorded: ${event.id} from ${sourceIp}`);

    return event;
  }

  private addEvent(event: DeceptionEvent) {
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
      this.recentEvents.shift(); // Remove oldest
    }
  }

  public getThreatIntelligence() {
    return {
      activeHoneypots: this.honeypots.size,
      activeTokens: this.honeyTokens.size,
      totalEvents: this.recentEvents.length, // Aliased for backward compatibility/test expectation
      recentEventsCount: this.recentEvents.length,
      recentEvents: this.recentEvents.slice(-10),
      attributionStats: this.calculateAttributionStats()
    };
  }

  public getHoneypot(id: string): Honeypot | undefined {
      return this.honeypots.get(id);
  }

  private generateTokenString(type: string): string {
    switch (type) {
      case 'API_KEY':
        return `sk-live-${uuidv4().replace(/-/g, '')}`;
      case 'USER_CREDENTIAL':
        return `user_${Math.random().toString(36).substr(2, 8)}`;
      default:
        return uuidv4();
    }
  }

  private calculateAttributionStats() {
    return this.recentEvents.filter(e => e.attribution?.confidence === 'HIGH').length;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
