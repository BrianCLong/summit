"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = exports.advancedAuditSystem = exports.getAuditSystem = void 0;
// @ts-nocheck
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const advanced_audit_system_js_1 = require("./advanced-audit-system.js");
const emit_js_1 = require("./emit.js");
const config_js_1 = require("../config.js");
// Create singleton instance
let instance = null;
const getAuditSystem = () => {
    if (!instance) {
        const logger = pino_1.default({ name: 'audit-system' });
        // We use a dedicated pool or the shared one.
        // Here we create a new pool to ensure audit logs can be written
        // even if the main app pool is busy/saturated, although often sharing is fine.
        // NOTE: This creates a separate connection pool for audit logging isolation.
        // For simplicity in this factory, we'll reuse the connection string.
        const db = new pg_1.Pool({ connectionString: config_js_1.dbUrls.postgres });
        const redis = new ioredis_1.default(config_js_1.dbUrls.redis, {
            password: config_js_1.cfg.REDIS_PASSWORD || undefined,
        });
        // Use environment secrets for signing/encryption keys
        // In production, these should be distinct, high-entropy keys
        const signingKey = process.env.AUDIT_SIGNING_KEY || config_js_1.cfg.JWT_SECRET;
        const encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || config_js_1.cfg.JWT_REFRESH_SECRET;
        instance = new advanced_audit_system_js_1.AdvancedAuditSystem(db, redis, logger, signingKey, encryptionKey);
    }
    return instance;
};
exports.getAuditSystem = getAuditSystem;
// Export the singleton instance directly as 'advancedAuditSystem' to match existing import usage
// However, the existing 'advancedAuditSystem' was an object with a stub 'logEvent' method.
// The real class has 'recordEvent'. We need to align the interface or update consumers.
// The existing stub:
// export const advancedAuditSystem = { logEvent: ... }
// The real class has recordEvent.
// I will export a proxy object that lazily initializes the system and maps logEvent -> recordEvent
// to maintain backward compatibility while "enabling" the real system.
exports.advancedAuditSystem = {
    logEvent: async (event) => {
        const sys = (0, exports.getAuditSystem)();
        // Map 'event' to the expected Partial<AuditEvent>
        // The stub took 'any', the real one takes 'Partial<AuditEvent>'
        return sys.recordEvent(event);
    },
    // Expose other methods if needed, or consumers can use getAuditSystem()
    recordEvent: async (event) => {
        return (0, exports.getAuditSystem)().recordEvent(event);
    },
    queryEvents: async (query) => {
        return (0, exports.getAuditSystem)().queryEvents(query);
    },
    refreshTimelineRollups: async (options) => {
        return (0, exports.getAuditSystem)().refreshTimelineRollups(options ?? {});
    },
    getTimelineBuckets: async (rangeStart, rangeEnd, granularity = 'day', filters = {}) => {
        return (0, exports.getAuditSystem)().getTimelineBuckets(rangeStart, rangeEnd, granularity, filters);
    },
};
exports.audit = {
    emit: emit_js_1.emitAuditEvent,
};
