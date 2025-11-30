
import { Pool } from 'pg';
import Redis from 'ioredis';
import { pino } from 'pino';
import { AdvancedAuditSystem } from './advanced-audit-system.js';
import { cfg, dbUrls } from '../../config.js';

// Create singleton instance
let instance: AdvancedAuditSystem | null = null;

export const getAuditSystem = () => {
  if (!instance) {
    const logger = pino({ name: 'audit-system' });

    // We use a dedicated pool or the shared one.
    // Here we create a new pool to ensure audit logs can be written
    // even if the main app pool is busy/saturated, although often sharing is fine.
    // NOTE: This creates a separate connection pool for audit logging isolation.
    // For simplicity in this factory, we'll reuse the connection string.
    const db = new Pool({ connectionString: dbUrls.postgres });

    const redis = new Redis(dbUrls.redis, {
        password: cfg.REDIS_PASSWORD || undefined,
    });

    // Use environment secrets for signing/encryption keys
    // In production, these should be distinct, high-entropy keys
    const signingKey = process.env.AUDIT_SIGNING_KEY || cfg.JWT_SECRET;
    const encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || cfg.JWT_REFRESH_SECRET;

    instance = new AdvancedAuditSystem(db, redis, logger, signingKey, encryptionKey);
  }
  return instance;
};

// Export the singleton instance directly as 'advancedAuditSystem' to match existing import usage
// However, the existing 'advancedAuditSystem' was an object with a stub 'logEvent' method.
// The real class has 'recordEvent'. We need to align the interface or update consumers.
// The existing stub:
// export const advancedAuditSystem = { logEvent: ... }
// The real class has recordEvent.
// I will export a proxy object that lazily initializes the system and maps logEvent -> recordEvent
// to maintain backward compatibility while "enabling" the real system.

export const advancedAuditSystem = {
  logEvent: async (event: any) => {
    const sys = getAuditSystem();
    // Map 'event' to the expected Partial<AuditEvent>
    // The stub took 'any', the real one takes 'Partial<AuditEvent>'
    return sys.recordEvent(event);
  },
  // Expose other methods if needed, or consumers can use getAuditSystem()
  recordEvent: async (event: any) => {
    return getAuditSystem().recordEvent(event);
  },
  queryEvents: async (query: any) => {
    return getAuditSystem().queryEvents(query);
  }
};
