/**
 * Zero-Trust Architecture Enhancement Module
 *
 * Provides hardware-rooted trust, confidential computing integration,
 * and immutable audit capabilities for zero-trust security.
 *
 * @module security/zero-trust
 * @version 4.0.0-alpha
 */

// Types
export * from './types.js';

// Services
export {
  HSMServiceImpl,
  HSMError,
  createHSMService,
} from './HSMService.js';

export type {
  HSMServiceConfig,
  HSMProviderConfig,
  KeyRotationPolicy,
} from './HSMService.js';

export {
  ImmutableAuditServiceImpl,
  AuditError,
  createImmutableAuditService,
} from './ImmutableAuditService.js';

export type {
  AuditServiceConfig,
} from './ImmutableAuditService.js';

// Unified Zero-Trust Service
import { HSMServiceImpl, createHSMService, HSMServiceConfig } from './HSMService.js';
import {
  ImmutableAuditServiceImpl,
  createImmutableAuditService,
  AuditServiceConfig,
} from './ImmutableAuditService.js';

/**
 * Zero-Trust Service Configuration
 */
export interface ZeroTrustConfig {
  hsm?: HSMServiceConfig;
  audit?: AuditServiceConfig;
  enableConfidentialComputing?: boolean;
  enableBlockchainAnchoring?: boolean;
}

/**
 * Unified Zero-Trust Security Service
 *
 * Provides a single interface to all zero-trust security capabilities
 * including HSM operations, immutable audit logging, and session management.
 */
export class ZeroTrustService {
  public readonly hsm: HSMServiceImpl;
  public readonly audit: ImmutableAuditServiceImpl;
  private initialized = false;

  constructor(private config: ZeroTrustConfig = {}) {
    this.hsm = createHSMService(config.hsm);
    this.audit = createImmutableAuditService(config.audit);
  }

  /**
   * Initialize all zero-trust services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize HSM service
    await this.hsm.initialize();

    // Generate audit signing key in HSM
    const signingKey = await this.hsm.generateKey({
      keyType: 'EC',
      curve: 'P-256',
      purpose: ['sign', 'verify'],
      extractable: false,
      persistent: true,
      labels: { name: 'audit-signing-key', usage: 'audit-ledger' },
    });

    // Record initialization event
    await this.audit.recordEvent({
      timestamp: new Date().toISOString(),
      entryType: 'security_event',
      payload: {
        event: 'zero_trust_initialized',
        signingKeyId: signingKey.id,
        hsmProvider: signingKey.providerId,
      },
      metadata: {
        actorId: 'system',
        actorType: 'system',
        tenantId: 'system',
        resourceType: 'zero-trust-service',
        resourceId: 'initialization',
        action: 'initialize',
        outcome: 'success',
      },
    });

    this.initialized = true;
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Record a security-relevant event
   */
  async recordSecurityEvent(
    actorId: string,
    actorType: 'user' | 'service' | 'system',
    tenantId: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<string> {
    const entry = await this.audit.recordEvent({
      timestamp: new Date().toISOString(),
      entryType: 'security_event',
      payload: details,
      metadata: {
        actorId,
        actorType,
        tenantId,
        resourceType: 'security',
        resourceId: details.resourceId as string || 'unknown',
        action,
        outcome: 'success',
      },
    });

    return entry.id;
  }

  /**
   * Verify audit chain integrity
   */
  async verifyAuditIntegrity(
    startTime?: string,
    endTime?: string
  ): Promise<{ valid: boolean; entriesVerified: number; brokenAt?: number }> {
    const entries = await this.audit.queryEntries({
      startTime,
      endTime,
      limit: 10000,
    });

    if (entries.length === 0) {
      return { valid: true, entriesVerified: 0 };
    }

    const startSequence = entries[0].sequence;
    const endSequence = entries[entries.length - 1].sequence;

    const result = await this.audit.verifyChain(startSequence, endSequence);

    return {
      valid: result.valid,
      entriesVerified: result.entriesVerified,
      brokenAt: result.brokenAt,
    };
  }
}

/**
 * Create a new Zero-Trust Service instance
 */
export function createZeroTrustService(config?: ZeroTrustConfig): ZeroTrustService {
  return new ZeroTrustService(config);
}

// Default singleton instance
let defaultInstance: ZeroTrustService | null = null;

/**
 * Get the default Zero-Trust Service instance
 */
export function getZeroTrustService(): ZeroTrustService {
  if (!defaultInstance) {
    defaultInstance = createZeroTrustService();
  }
  return defaultInstance;
}

export default ZeroTrustService;
