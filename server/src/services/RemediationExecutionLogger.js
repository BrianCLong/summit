"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remediationLogger = exports.RemediationExecutionLogger = void 0;
const crypto_1 = require("crypto");
const crypto_2 = require("crypto");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const advanced_audit_system_js_1 = require("../audit/advanced-audit-system.js");
class RemediationExecutionLogger {
    static instance;
    auditSystem;
    signingKey;
    lastHash = '';
    constructor() {
        this.auditSystem = advanced_audit_system_js_1.AdvancedAuditSystem.getInstance();
        this.signingKey = process.env.REMEDIATION_SIGNING_KEY || 'dev-remediation-key-insecure';
        if (process.env.NODE_ENV === 'production' && this.signingKey === 'dev-remediation-key-insecure') {
            throw new Error('REMEDIATION_SIGNING_KEY must be set in production for tamper-proof remediation logs');
        }
    }
    static getInstance() {
        if (!RemediationExecutionLogger.instance) {
            RemediationExecutionLogger.instance = new RemediationExecutionLogger();
        }
        return RemediationExecutionLogger.instance;
    }
    /**
     * Log a remediation action with cryptographic signature
     */
    async logAction(action) {
        const completeAction = {
            ...action,
            id: (0, crypto_2.randomUUID)(),
            executedAt: new Date()
        };
        // Calculate hash of the action
        const hash = this.calculateHash(completeAction);
        // Sign the action
        const signature = this.signAction(completeAction, hash);
        const signedLog = {
            action: completeAction,
            hash,
            signature,
            previousHash: this.lastHash || undefined
        };
        // Update chain
        this.lastHash = hash;
        // Record in audit system
        await this.auditSystem.recordEvent({
            eventType: 'task_execute',
            level: action.outcome === 'failure' ? 'error' : 'info',
            action: `remediation:${action.actionType}`,
            outcome: action.outcome,
            message: `Automated remediation executed: ${action.actionType}`,
            details: {
                incidentId: action.incidentId,
                playbookId: action.playbookId,
                actionPayload: action.actionPayload,
                signature: signature,
                hash: hash,
                previousHash: this.lastHash
            },
            complianceRelevant: true,
            complianceFrameworks: ['SOC2', 'ISO27001']
        });
        logger_js_1.default.info({
            actionId: completeAction.id,
            incidentId: action.incidentId,
            playbookId: action.playbookId,
            actionType: action.actionType,
            outcome: action.outcome
        }, 'Remediation action logged and signed');
        return signedLog;
    }
    /**
     * Verify the integrity of a signed remediation log
     */
    verifyLog(log) {
        // Verify hash
        const calculatedHash = this.calculateHash(log.action);
        if (calculatedHash !== log.hash) {
            logger_js_1.default.error({ actionId: log.action.id }, 'Hash mismatch - possible tampering detected');
            return false;
        }
        // Verify signature
        const isValid = this.verifySignature(log.action, log.hash, log.signature);
        if (!isValid) {
            logger_js_1.default.error({ actionId: log.action.id }, 'Invalid signature - tampering detected');
            return false;
        }
        return true;
    }
    /**
     * Verify chain integrity across multiple logs
     */
    verifyChain(logs) {
        if (logs.length === 0)
            return { valid: true };
        for (let i = 1; i < logs.length; i++) {
            const current = logs[i];
            const previous = logs[i - 1];
            if (current.previousHash !== previous.hash) {
                logger_js_1.default.error({
                    currentId: current.action.id,
                    previousId: previous.action.id
                }, 'Chain integrity violation detected');
                return { valid: false, brokenAt: i };
            }
            if (!this.verifyLog(current)) {
                return { valid: false, brokenAt: i };
            }
        }
        return { valid: true };
    }
    calculateHash(action) {
        const data = JSON.stringify({
            id: action.id,
            incidentId: action.incidentId,
            playbookId: action.playbookId,
            actionType: action.actionType,
            actionPayload: action.actionPayload,
            executedAt: action.executedAt.toISOString(),
            executedBy: action.executedBy,
            outcome: action.outcome
        });
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    signAction(action, hash) {
        // Use HMAC for symmetric key signing
        const hmac = (0, crypto_1.createHash)('sha256');
        hmac.update(hash + this.signingKey);
        return hmac.digest('hex');
    }
    verifySignature(action, hash, signature) {
        try {
            // Verify HMAC signature
            const expectedSignature = this.signAction(action, hash);
            return expectedSignature === signature;
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Signature verification failed');
            return false;
        }
    }
}
exports.RemediationExecutionLogger = RemediationExecutionLogger;
exports.remediationLogger = RemediationExecutionLogger.getInstance();
