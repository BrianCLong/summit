"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveTrafficController = void 0;
exports.certifyIntegration = certifyIntegration;
exports.verifySignedWebhook = verifySignedWebhook;
exports.enforcementLadder = enforcementLadder;
const crypto_1 = __importDefault(require("crypto"));
const dayjs_1 = __importDefault(require("dayjs"));
const types_1 = require("./types");
const REQUIRED_CONTROLS = {
    versioningStrategy: ['semver', 'dated'],
    pagination: ['cursor', 'offset'],
    errorModel: ['typed'],
    idempotencyKeys: [true],
    webhooksSigned: [true],
    replayWindowSeconds: (value) => value <= 300,
    scopedPermissions: (value) => value.length > 0,
    dependencyScanning: [true],
    secretHandling: ['vaulted'],
    egressPolicy: ['restricted'],
};
function certifyIntegration(contract) {
    const violations = [];
    if (!REQUIRED_CONTROLS.versioningStrategy.includes(contract.versioningStrategy)) {
        violations.push('versioning required (semver or dated)');
    }
    if (!REQUIRED_CONTROLS.pagination.includes(contract.pagination)) {
        violations.push('pagination must be cursor or offset based');
    }
    if (!REQUIRED_CONTROLS.errorModel.includes(contract.errorModel)) {
        violations.push('error model must be typed');
    }
    if (!REQUIRED_CONTROLS.idempotencyKeys.includes(contract.idempotencyKeys)) {
        violations.push('idempotency keys required');
    }
    if (!REQUIRED_CONTROLS.webhooksSigned.includes(contract.webhooksSigned)) {
        violations.push('webhooks must be signed');
    }
    if (typeof REQUIRED_CONTROLS.replayWindowSeconds === 'function' && !REQUIRED_CONTROLS.replayWindowSeconds(contract.replayWindowSeconds)) {
        violations.push('replay window must be <= 300 seconds');
    }
    if (typeof REQUIRED_CONTROLS.scopedPermissions === 'function' && !REQUIRED_CONTROLS.scopedPermissions(contract.scopedPermissions)) {
        violations.push('scoped permissions required');
    }
    if (!REQUIRED_CONTROLS.dependencyScanning.includes(contract.dependencyScanning)) {
        violations.push('dependency scanning required');
    }
    if (!REQUIRED_CONTROLS.secretHandling.includes(contract.secretHandling)) {
        violations.push('secrets must be vaulted');
    }
    if (!REQUIRED_CONTROLS.egressPolicy.includes(contract.egressPolicy)) {
        violations.push('egress must be restricted');
    }
    return { passed: violations.length === 0, violations };
}
function verifySignedWebhook(payload, timestamp, providedSignature, secret, replayWindowSeconds = 300) {
    const now = (0, dayjs_1.default)();
    if (Math.abs(now.diff((0, dayjs_1.default)(timestamp * 1000), 'second')) > replayWindowSeconds) {
        return false;
    }
    const hmac = crypto_1.default.createHmac('sha256', secret);
    hmac.update(`${timestamp}.${payload}`);
    const expected = hmac.digest('hex');
    return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(providedSignature));
}
class AdaptiveTrafficController {
    baseQuota;
    constructor(baseQuota) {
        this.baseQuota = baseQuota;
    }
    adjustQuota(tier, signals) {
        const trigger = signals.find((s) => s.value >= s.threshold);
        if (!trigger) {
            return { newQuota: this.baseQuota, rationale: 'healthy', triggeredBy: null };
        }
        const reductionFactor = this.calculateReductionFactor(tier, trigger);
        return {
            newQuota: Math.max(1, Math.floor(this.baseQuota * reductionFactor)),
            rationale: `throttled due to ${trigger.metric}=${trigger.value}`,
            triggeredBy: trigger,
        };
    }
    calculateReductionFactor(tier, trigger) {
        const base = trigger.metric === 'abuse' ? 0.25 : 0.5;
        const tierBuffer = tier === types_1.PartnerSegment.STRATEGIC ? 0.2 : tier === types_1.PartnerSegment.GROWTH ? 0.1 : 0;
        return base + tierBuffer;
    }
}
exports.AdaptiveTrafficController = AdaptiveTrafficController;
function enforcementLadder(signal) {
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
