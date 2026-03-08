"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityControls = void 0;
const crypto_1 = require("crypto");
class SecurityControls {
    egressPolicy;
    approvals = new Set();
    killSwitches = new Set();
    rateLimits;
    hits = new Map();
    constructor(policy, rateLimits) {
        this.egressPolicy = policy;
        this.rateLimits = rateLimits;
    }
    verifyWebhookSignature(payload, signature, secret) {
        const computed = (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
        return computed === signature;
    }
    assertEgress(url) {
        const host = new URL(url).host;
        if (!this.egressPolicy.allowedHosts.includes(host)) {
            throw new Error(`Egress host ${host} not allowed`);
        }
    }
    requireApproval(connectorId) {
        if (!this.approvals.has(connectorId)) {
            throw new Error(`Connector ${connectorId} requires two-person approval`);
        }
    }
    approve(connectorId) {
        this.approvals.add(connectorId);
    }
    enableKillSwitch(connectorId) {
        this.killSwitches.add(connectorId);
    }
    isDisabled(connectorId) {
        return this.killSwitches.has(connectorId);
    }
    enforceRateLimit(tenantId) {
        const window = this.rateLimits.find((limit) => limit.tenantId === tenantId);
        if (!window)
            return;
        const now = Date.now();
        const history = this.hits.get(tenantId) ?? [];
        const windowStart = now - window.windowMs;
        const filtered = history.filter((timestamp) => timestamp >= windowStart);
        if (filtered.length >= window.limit) {
            throw new Error('Rate limit exceeded');
        }
        filtered.push(now);
        this.hits.set(tenantId, filtered);
    }
}
exports.SecurityControls = SecurityControls;
