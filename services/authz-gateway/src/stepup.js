"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepUpManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const webauthn_credentials_json_1 = __importDefault(require("./data/webauthn-credentials.json"));
const observability_1 = require("./observability");
const prom_client_1 = require("prom-client");
const credentialDirectory = webauthn_credentials_json_1.default;
const DEFAULT_STEP_UP_TTL = 5 * 60 * 1000;
const DEFAULT_ELEVATION_TTL = 10 * 60 * 1000;
const DEFAULT_MAX_CACHED_CHALLENGES = 1000;
function getOrCreateGauge(name, factory) {
    const existing = observability_1.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    observability_1.registry.registerMetric(metric);
    return metric;
}
function getOrCreateCounter(name, factory) {
    const existing = observability_1.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    observability_1.registry.registerMetric(metric);
    return metric;
}
const stepUpCacheSize = getOrCreateGauge('authz_gateway_stepup_cache_size', () => new prom_client_1.Gauge({
    name: 'authz_gateway_stepup_cache_size',
    help: 'Number of active step-up challenges held in memory.',
}));
const stepUpEvictionsTotal = getOrCreateCounter('authz_gateway_stepup_evictions_total', () => new prom_client_1.Counter({
    name: 'authz_gateway_stepup_evictions_total',
    help: 'Total number of step-up challenges evicted.',
    labelNames: ['reason'],
}));
function toBase64Url(buffer) {
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}
function fromBase64Url(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
    return Buffer.from(padded, 'base64');
}
function getRegisteredCredentials(userId) {
    const entries = credentialDirectory[userId] ?? [];
    return entries.map((entry) => ({
        credentialId: entry.credentialId,
        publicKeyPem: entry.publicKeyPem,
        userHandle: entry.userHandle,
        deviceName: entry.deviceName,
        lastUsed: entry.lastUsed,
    }));
}
class StepUpManager {
    ttlMs;
    now;
    elevationTtlMs;
    maxCachedChallenges;
    challengeCache = new Map();
    constructor(options = {}) {
        this.ttlMs = options.ttlMs ?? DEFAULT_STEP_UP_TTL;
        this.now = options.now ?? Date.now;
        this.elevationTtlMs = options.elevationTtlMs ?? DEFAULT_ELEVATION_TTL;
        this.maxCachedChallenges = Math.max(1, options.maxCachedChallenges ?? DEFAULT_MAX_CACHED_CHALLENGES);
        this.updateCacheSizeMetric();
    }
    clear() {
        this.challengeCache.clear();
        this.updateCacheSizeMetric();
    }
    createChallenge(userId, context) {
        this.cleanupExpired();
        this.enforceCapacity();
        if (!context.sessionId) {
            throw new Error('session_missing');
        }
        if (!context.requestedAction) {
            throw new Error('action_missing');
        }
        const normalizedContext = {
            ...context,
            currentAcr: context.currentAcr ?? 'loa1',
        };
        const registered = getRegisteredCredentials(userId);
        if (!registered.length) {
            throw new Error('no_registered_device');
        }
        const challengeBuffer = crypto_1.default.randomBytes(32);
        const challenge = toBase64Url(challengeBuffer);
        const primary = registered[0];
        this.challengeCache.set(userId, {
            challenge,
            credentialId: primary.credentialId,
            expiresAt: this.now() + this.ttlMs,
            used: false,
            context: normalizedContext,
            createdAt: this.now(),
        });
        this.updateCacheSizeMetric();
        return {
            challenge,
            allowCredentials: registered.map((entry) => ({
                id: entry.credentialId,
                type: 'public-key',
                transports: ['usb', 'nfc', 'ble', 'hybrid'],
                displayName: entry.deviceName,
                authenticatorAttachment: 'cross-platform',
                deviceType: entry.deviceName.toLowerCase().includes('yubi')
                    ? 'yubikey'
                    : 'fido2-key',
            })),
            expiresAt: new Date(this.now() + this.ttlMs).toISOString(),
            context: {
                requestedAction: normalizedContext.requestedAction,
                resourceId: normalizedContext.resourceId,
                classification: normalizedContext.classification,
                tenantId: normalizedContext.tenantId,
            },
        };
    }
    verifyResponse(userId, payload, sessionId) {
        this.cleanupExpired();
        const entry = this.challengeCache.get(userId);
        if (!entry) {
            throw new Error('challenge_not_found');
        }
        if (entry.used) {
            throw new Error('challenge_already_used');
        }
        if (entry.expiresAt < this.now()) {
            this.challengeCache.delete(userId);
            throw new Error('challenge_expired');
        }
        if (payload.challenge !== entry.challenge) {
            throw new Error('challenge_mismatch');
        }
        if (payload.credentialId !== entry.credentialId) {
            throw new Error('credential_mismatch');
        }
        if (entry.context.sessionId !== sessionId) {
            throw new Error('session_mismatch');
        }
        const registered = getRegisteredCredentials(userId).find((device) => device.credentialId === payload.credentialId);
        if (!registered) {
            throw new Error('credential_not_registered');
        }
        const verifier = crypto_1.default.createVerify('SHA256');
        verifier.update(Buffer.from(payload.challenge, 'utf8'));
        verifier.end();
        const signatureBuffer = fromBase64Url(payload.signature);
        const verified = verifier.verify(registered.publicKeyPem, signatureBuffer);
        if (!verified) {
            throw new Error('signature_invalid');
        }
        entry.used = true;
        this.challengeCache.delete(userId);
        stepUpEvictionsTotal.inc({ reason: 'used' });
        this.updateCacheSizeMetric();
        return {
            ...entry.context,
            grantedAt: new Date(this.now()).toISOString(),
            expiresAt: new Date(this.now() + this.elevationTtlMs).toISOString(),
            mechanism: 'webauthn',
            challengeId: entry.challenge,
        };
    }
    cleanupExpired() {
        const now = this.now();
        let removed = false;
        for (const [userId, entry] of this.challengeCache.entries()) {
            if (entry.expiresAt <= now) {
                this.challengeCache.delete(userId);
                stepUpEvictionsTotal.inc({ reason: 'expired' });
                removed = true;
            }
        }
        if (removed) {
            this.updateCacheSizeMetric();
        }
    }
    enforceCapacity() {
        while (this.challengeCache.size >= this.maxCachedChallenges) {
            const oldest = this.challengeCache.keys().next().value;
            if (!oldest) {
                break;
            }
            this.challengeCache.delete(oldest);
            stepUpEvictionsTotal.inc({ reason: 'bounded' });
        }
        this.updateCacheSizeMetric();
    }
    updateCacheSizeMetric() {
        stepUpCacheSize.set(this.challengeCache.size);
    }
}
exports.StepUpManager = StepUpManager;
