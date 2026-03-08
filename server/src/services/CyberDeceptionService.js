"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberDeceptionService = void 0;
// @ts-nocheck
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const BehavioralFingerprintService_js_1 = require("./BehavioralFingerprintService.js");
const ledger_js_1 = require("../provenance/ledger.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const events_1 = require("events");
/**
 * Cyber Deception Service
 *
 * Manages distributed honeypots, honeytokens, and deception events.
 * Integrates with BehavioralFingerprintService for attribution and
 * ProvenanceLedgerV2 for audit trails.
 */
class CyberDeceptionService extends events_1.EventEmitter {
    static instance;
    // In-memory cache of active assets (persisted via ledger for audit)
    honeypots = new Map();
    // Map hashed token values to token objects for secure lookups
    honeyTokens = new Map();
    // Use a capped buffer for recent events to avoid memory leaks
    recentEvents = [];
    MAX_RECENT_EVENTS = 1000;
    fingerprintService;
    provenanceLedger;
    constructor() {
        super();
        this.fingerprintService = new BehavioralFingerprintService_js_1.BehavioralFingerprintService();
        this.provenanceLedger = new ledger_js_1.ProvenanceLedgerV2();
        this.rehydrateState().catch(err => logger_js_1.default.error('Failed to rehydrate deception state', err));
    }
    static getInstance() {
        if (!CyberDeceptionService.instance) {
            CyberDeceptionService.instance = new CyberDeceptionService();
        }
        return CyberDeceptionService.instance;
    }
    /**
     * Rehydrate in-memory state from the persistent ledger on startup.
     * This ensures honeypots and tokens survive restarts.
     */
    async rehydrateState() {
        try {
            // Rehydrate Honeypots
            const hpEntries = await this.provenanceLedger.getEntries('system', {
                actionType: 'HONEYPOT_REGISTER',
                limit: 1000 // Reasonable limit for MVP
            });
            for (const entry of hpEntries) {
                if (entry.resourceId && entry.payload) {
                    const honeypot = {
                        id: entry.resourceId,
                        config: entry.payload,
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
                    const payload = entry.payload;
                    if (payload.tokenHash) {
                        const token = {
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
            logger_js_1.default.info(`Rehydrated ${this.honeypots.size} honeypots and ${this.honeyTokens.size} tokens from ledger.`);
        }
        catch (error) {
            logger_js_1.default.error('Error rehydrating deception state:', error);
        }
    }
    /**
     * Register a new distributed honeypot
     */
    async registerHoneypot(config) {
        const id = (0, uuid_1.v4)();
        const honeypot = {
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
        }).catch(err => logger_js_1.default.error(`Failed to log honeypot registration: ${err.message}`));
        logger_js_1.default.info(`Registered honeypot: ${id} (${config.type})`);
        return honeypot;
    }
    /**
     * Generate a new deception token (Honeytoken)
     */
    async generateHoneyToken(config) {
        const id = (0, uuid_1.v4)();
        const tokenValue = this.generateTokenString(config.type);
        const tokenHash = this.hashToken(tokenValue);
        const token = {
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
        }).catch(err => logger_js_1.default.error(`Failed to log token generation: ${err.message}`));
        logger_js_1.default.info(`Generated honeytoken: ${id} (${config.type})`);
        return token;
    }
    /**
     * Record a deception event (interaction with honeypot or token)
     */
    async recordInteraction(type, targetId, // For tokens, this is the token value
    sourceIp, metadata = {}) {
        let verifiedTargetId = targetId;
        let resourceType = 'unknown';
        if (type === 'TOKEN_USE') {
            resourceType = 'honeytoken';
            // Hash incoming token value to lookup
            const tokenHash = this.hashToken(targetId);
            const token = this.honeyTokens.get(tokenHash);
            if (!token) {
                logger_js_1.default.warn(`Interaction with unknown token: ${targetId}`);
                // We still record it
            }
            else {
                verifiedTargetId = token.id;
            }
        }
        else if (type === 'HONEYPOT_TRIGGER') {
            resourceType = 'honeypot';
            if (!this.honeypots.has(targetId)) {
                logger_js_1.default.warn(`Interaction with unknown honeypot: ${targetId}`);
            }
        }
        // Behavioral Fingerprinting
        const telemetry = {
            clicks: metadata.clicks || 0,
            timeInView: metadata.duration || 0,
            editRate: metadata.keystrokes || 0,
        };
        const fingerprint = this.fingerprintService.computeFingerprint([telemetry]);
        const fingerprintScore = this.fingerprintService.scoreFingerprint(fingerprint);
        const event = {
            id: (0, uuid_1.v4)(),
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
        }).catch(err => logger_js_1.default.error(`Failed to log deception event: ${err.message}`));
        logger_js_1.default.info(`Deception event recorded: ${event.id} from ${sourceIp}`);
        return event;
    }
    addEvent(event) {
        this.recentEvents.push(event);
        if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
            this.recentEvents.shift(); // Remove oldest
        }
    }
    getThreatIntelligence() {
        return {
            activeHoneypots: this.honeypots.size,
            activeTokens: this.honeyTokens.size,
            totalEvents: this.recentEvents.length, // Aliased for backward compatibility/test expectation
            recentEventsCount: this.recentEvents.length,
            recentEvents: this.recentEvents.slice(-10),
            attributionStats: this.calculateAttributionStats()
        };
    }
    getHoneypot(id) {
        return this.honeypots.get(id);
    }
    generateTokenString(type) {
        switch (type) {
            case 'API_KEY':
                return `sk-live-${(0, uuid_1.v4)().replace(/-/g, '')}`;
            case 'USER_CREDENTIAL':
                return `user_${Math.random().toString(36).substr(2, 8)}`;
            default:
                return (0, uuid_1.v4)();
        }
    }
    calculateAttributionStats() {
        return this.recentEvents.filter(e => e.attribution?.confidence === 'HIGH').length;
    }
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
}
exports.CyberDeceptionService = CyberDeceptionService;
