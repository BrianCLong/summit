"use strict";
/**
 * Transparency Service
 *
 * Provides public transparency reports, decision explanations,
 * and citizen-facing audit capabilities for government AI systems.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransparencyService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
class TransparencyService {
    reports = new Map();
    decisions = new Map();
    auditChain = [];
    agency;
    auditService;
    constructor(config) {
        this.agency = config.agency;
        this.auditService = config.auditService;
    }
    /**
     * Record an AI-assisted decision with full explanation
     */
    async recordDecision(decision) {
        const fullDecision = {
            ...decision,
            decisionId: (0, uuid_1.v4)(),
            madeAt: new Date().toISOString(),
        };
        this.decisions.set(fullDecision.decisionId, fullDecision);
        await this.appendAuditEvent({
            eventType: 'decision_made',
            actorId: 'system',
            actorType: 'system',
            resourceType: 'ai_decision',
            resourceId: fullDecision.decisionId,
            details: {
                modelId: fullDecision.modelId,
                decisionType: fullDecision.decisionType,
                confidence: fullDecision.confidence,
                humanReviewRequired: fullDecision.humanReviewRequired,
            },
        });
        return fullDecision;
    }
    /**
     * Get decision details including explanation
     */
    async getDecision(decisionId) {
        return this.decisions.get(decisionId) ?? null;
    }
    /**
     * Get citizen-facing explanation of a decision
     */
    async getDecisionExplanation(decisionId) {
        const decision = this.decisions.get(decisionId);
        if (!decision) {
            return null;
        }
        return {
            summary: decision.explanation.humanReadable,
            factors: decision.explanation.contributingFactors.map((f) => ({
                factor: f.factor,
                impact: f.direction === 'positive' ? 'Supported outcome' :
                    f.direction === 'negative' ? 'Opposed outcome' : 'Neutral',
            })),
            appealInfo: decision.appealable ? {
                deadline: decision.appealDeadline ?? 'Contact agency for deadline',
                process: 'Submit appeal through citizen portal or contact agency directly',
            } : undefined,
        };
    }
    /**
     * File an appeal for a decision
     */
    async fileAppeal(decisionId, citizenId, grounds) {
        const decision = this.decisions.get(decisionId);
        if (!decision) {
            throw new Error('Decision not found');
        }
        if (!decision.appealable) {
            throw new Error('This decision is not appealable');
        }
        if (decision.appealDeadline && new Date(decision.appealDeadline) < new Date()) {
            throw new Error('Appeal deadline has passed');
        }
        const appealId = (0, uuid_1.v4)();
        await this.appendAuditEvent({
            eventType: 'decision_appealed',
            actorId: citizenId,
            actorType: 'citizen',
            resourceType: 'ai_decision',
            resourceId: decisionId,
            details: { appealId, grounds },
        });
        return { appealId, status: 'pending_review' };
    }
    /**
     * Generate transparency report for a period
     */
    async generateReport(periodStart, periodEnd) {
        const decisionsInPeriod = Array.from(this.decisions.values()).filter((d) => {
            const madeAt = new Date(d.madeAt);
            return madeAt >= periodStart && madeAt <= periodEnd;
        });
        const eventsInPeriod = this.auditChain.filter((e) => {
            const timestamp = new Date(e.timestamp);
            return timestamp >= periodStart && timestamp <= periodEnd;
        });
        const report = {
            reportId: (0, uuid_1.v4)(),
            reportingPeriod: {
                start: periodStart.toISOString(),
                end: periodEnd.toISOString(),
            },
            agency: this.agency,
            aiSystemsDeployed: new Set(decisionsInPeriod.map((d) => d.modelId)).size,
            decisionsAugmented: decisionsInPeriod.filter((d) => d.humanReviewRequired).length,
            decisionsAutomated: decisionsInPeriod.filter((d) => !d.humanReviewRequired).length,
            appealsReceived: eventsInPeriod.filter((e) => e.eventType === 'decision_appealed').length,
            appealsUpheld: eventsInPeriod.filter((e) => e.eventType === 'decision_overridden').length,
            dataAccessRequests: eventsInPeriod.filter((e) => e.eventType === 'data_accessed').length,
            dataAccessCompleted: eventsInPeriod.filter((e) => e.eventType === 'data_exported').length,
            incidentsReported: eventsInPeriod.filter((e) => e.eventType === 'bias_detected').length,
            incidentsResolved: 0, // Would need incident tracking
            biasAuditsCompleted: eventsInPeriod.filter((e) => e.eventType === 'ethical_review_completed').length,
            ethicalReviewsCompleted: eventsInPeriod.filter((e) => e.eventType === 'ethical_review_completed').length,
            publicConsultationsHeld: 0, // Would need consultation tracking
            generatedAt: new Date().toISOString(),
        };
        this.reports.set(report.reportId, report);
        await this.appendAuditEvent({
            eventType: 'transparency_report_published',
            actorId: 'system',
            actorType: 'system',
            resourceType: 'transparency_report',
            resourceId: report.reportId,
            details: { period: report.reportingPeriod },
        });
        return report;
    }
    /**
     * Publish a transparency report (makes it public)
     */
    async publishReport(reportId) {
        const report = this.reports.get(reportId);
        if (!report) {
            return null;
        }
        const published = {
            ...report,
            publishedAt: new Date().toISOString(),
        };
        this.reports.set(reportId, published);
        return published;
    }
    /**
     * Get published transparency reports
     */
    async getPublishedReports() {
        return Array.from(this.reports.values()).filter((r) => r.publishedAt);
    }
    /**
     * Query audit trail with filters
     */
    async queryAuditTrail(filters) {
        let events = [...this.auditChain];
        if (filters.eventType) {
            events = events.filter((e) => e.eventType === filters.eventType);
        }
        if (filters.actorId) {
            events = events.filter((e) => e.actorId === filters.actorId);
        }
        if (filters.resourceId) {
            events = events.filter((e) => e.resourceId === filters.resourceId);
        }
        if (filters.startTime) {
            events = events.filter((e) => new Date(e.timestamp) >= filters.startTime);
        }
        if (filters.endTime) {
            events = events.filter((e) => new Date(e.timestamp) <= filters.endTime);
        }
        return events.slice(0, filters.limit ?? 100);
    }
    /**
     * Verify audit chain integrity
     */
    async verifyAuditIntegrity() {
        for (let i = 1; i < this.auditChain.length; i++) {
            const event = this.auditChain[i];
            const previousEvent = this.auditChain[i - 1];
            if (event.previousHash !== previousEvent.currentHash) {
                return { valid: false, chainLength: this.auditChain.length, brokenAt: i };
            }
        }
        return { valid: true, chainLength: this.auditChain.length };
    }
    /**
     * Append event to immutable audit chain
     */
    async appendAuditEvent(event) {
        const previousHash = this.auditChain.length > 0
            ? this.auditChain[this.auditChain.length - 1].currentHash
            : '0'.repeat(64);
        const eventWithMeta = {
            ...event,
            eventId: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            previousHash,
        };
        const currentHash = crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(eventWithMeta))
            .digest('hex');
        const fullEvent = {
            ...eventWithMeta,
            currentHash,
        };
        this.auditChain.push(fullEvent);
        if (this.auditService) {
            await this.auditService.log(fullEvent);
        }
        return fullEvent;
    }
}
exports.TransparencyService = TransparencyService;
