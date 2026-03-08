"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessReview = exports.RiskRegister = void 0;
exports.detectLeakage = detectLeakage;
exports.healthToEnforcement = healthToEnforcement;
const dayjs_1 = __importDefault(require("dayjs"));
class RiskRegister {
    entries = new Map();
    upsert(entry) {
        this.entries.set(entry.partnerId, entry);
    }
    needsReview(partnerId, now = new Date()) {
        const entry = this.entries.get(partnerId);
        if (!entry)
            return true;
        return (0, dayjs_1.default)(now).diff((0, dayjs_1.default)(entry.lastReviewedAt), 'day') >= 90;
    }
}
exports.RiskRegister = RiskRegister;
class AccessReview {
    grants = new Map();
    issue(grant) {
        this.grants.set(grant.id, grant);
    }
    revokeExpired(now = new Date()) {
        const revoked = [];
        for (const grant of this.grants.values()) {
            if ((0, dayjs_1.default)(now).isAfter(grant.expiresAt)) {
                this.grants.delete(grant.id);
                revoked.push(grant.id);
            }
        }
        return revoked;
    }
    listActive(partnerId, now = new Date()) {
        return Array.from(this.grants.values()).filter((grant) => grant.partnerId === partnerId && (0, dayjs_1.default)(now).isBefore(grant.expiresAt));
    }
}
exports.AccessReview = AccessReview;
function detectLeakage(entitlements, usage) {
    if (usage.partnerId !== entitlements.partnerId)
        return null;
    if (usage.observedRate > entitlements.apiQuotaPerMinute * 1.1) {
        return { partnerId: usage.partnerId, reason: 'Unmetered usage exceeding entitlement', detectedAt: new Date() };
    }
    if (usage.userCount > entitlements.activeUsers * 1.2) {
        return { partnerId: usage.partnerId, reason: 'Over-granted user access', detectedAt: new Date() };
    }
    return null;
}
function healthToEnforcement(signal) {
    if (signal.metric === 'abuse' && signal.value >= signal.threshold * 2) {
        return 'terminate';
    }
    if (signal.value >= signal.threshold * 1.5) {
        return 'suspend';
    }
    if (signal.value >= signal.threshold) {
        return 'throttle';
    }
    return 'warn';
}
