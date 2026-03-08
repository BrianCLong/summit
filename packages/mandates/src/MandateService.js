"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MandateService = void 0;
const crypto_1 = require("crypto");
class MandateService {
    mandates = new Map();
    constructor() { }
    createMandate(issuer, description, scopes, limits, ttlSeconds = 3600) {
        const now = new Date();
        const mandate = {
            id: (0, crypto_1.randomUUID)(),
            issuedAt: now,
            expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
            issuer,
            description,
            scopes,
            limits,
        };
        this.mandates.set(mandate.id, mandate);
        return mandate;
    }
    getMandate(id) {
        return this.mandates.get(id);
    }
    verifyMandate(id, requiredScope) {
        const mandate = this.mandates.get(id);
        if (!mandate) {
            return { valid: false, reason: 'Mandate not found' };
        }
        const now = new Date();
        if (now > mandate.expiresAt) {
            return { valid: false, reason: 'Mandate expired' };
        }
        if (requiredScope) {
            const hasScope = mandate.scopes.some((s) => s.type === requiredScope.type && s.value === requiredScope.value);
            if (!hasScope) {
                return { valid: false, reason: `Missing required scope: ${requiredScope.type}:${requiredScope.value}` };
            }
        }
        return { valid: true, mandate };
    }
    revokeMandate(id) {
        return this.mandates.delete(id);
    }
}
exports.MandateService = MandateService;
