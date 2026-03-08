"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprehensiveAuditLoggingService = void 0;
// @ts-nocheck
const jsonwebtoken_1 = require("jsonwebtoken");
const logger_js_1 = __importDefault(require("../config/logger.js"));
class ComprehensiveAuditLoggingService {
    auditSystem;
    logger;
    signingKey;
    worm;
    constructor(auditSystem, options) {
        this.auditSystem = auditSystem;
        this.signingKey = options.signingKey;
        this.logger = options.logger ?? logger_js_1.default.child({ name: 'ComprehensiveAudit' });
        this.worm = options.worm;
    }
    async recordComprehensiveEvent(input) {
        const enrichedEvent = {
            ...input,
            level: input.level ?? 'info',
            details: input.details ?? {},
            complianceRelevant: input.complianceRelevant ?? true,
            complianceFrameworks: input.complianceFrameworks ?? ['SOC2'],
            timestamp: new Date(),
        };
        const eventId = await this.auditSystem.recordEvent(enrichedEvent);
        if (this.worm) {
            await this.worm.addAuditEntry({
                userId: input.userId || 'system',
                action: input.action,
                eventType: input.eventType,
                resource: input.resourceId || input.resourceType || 'unknown',
                details: input.details ?? {},
                classification: input.dataClassification || 'internal',
                sessionId: input.sessionId,
            });
        }
        this.logger.debug({ eventId, eventType: input.eventType, tenantId: input.tenantId }, 'Audit event recorded with tamper-proof trail');
        return { eventId };
    }
    async verifyTamperProofTrail(query) {
        const events = await this.auditSystem.queryEvents(query);
        const ordered = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const failures = [];
        let previousHash;
        ordered.forEach((event, index) => {
            if (!event.hash) {
                failures.push({ index, eventId: event.id, reason: 'missing_hash' });
                return;
            }
            if (previousHash && event.previousEventHash !== previousHash) {
                failures.push({
                    index,
                    eventId: event.id,
                    reason: 'hash_chain_mismatch',
                });
            }
            if (event.signature) {
                try {
                    (0, jsonwebtoken_1.verify)(event.signature, this.signingKey);
                }
                catch (error) {
                    failures.push({
                        index,
                        eventId: event.id,
                        reason: 'invalid_signature',
                    });
                }
            }
            else {
                failures.push({ index, eventId: event.id, reason: 'missing_signature' });
            }
            previousHash = event.hash;
        });
        return {
            valid: failures.length === 0,
            totalEvents: ordered.length,
            failures,
        };
    }
    async generateComplianceEvidence(framework, start, end, queryOverrides = {}) {
        const [report, integrity] = await Promise.all([
            this.auditSystem.generateComplianceReport(framework, start, end),
            this.verifyTamperProofTrail({
                startTime: start,
                endTime: end,
                ...queryOverrides,
            }),
        ]);
        return { report, integrity };
    }
}
exports.ComprehensiveAuditLoggingService = ComprehensiveAuditLoggingService;
