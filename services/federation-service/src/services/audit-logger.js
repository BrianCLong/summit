"use strict";
/**
 * Audit Logger
 *
 * Comprehensive audit logging for all federation operations.
 * Ensures compliance and chain-of-custody tracking.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.AuditLogger = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'audit' });
/**
 * Audit Logger Service
 */
class AuditLogger {
    auditLogs = [];
    /**
     * Log share push operation
     */
    logSharePush(context, objectCount, objectTypes, provenanceIds, success, errorMessage) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            operation: 'share_push',
            agreementId: context.agreementId,
            channelId: context.channelId,
            partnerId: context.partnerId,
            userId: context.userId,
            objectCount,
            objectTypes,
            success,
            errorMessage,
            provenanceIds,
            metadata: {
                requestId: context.requestId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            },
        };
        this.auditLogs.push(entry);
        logger.info({
            auditId: entry.id,
            operation: entry.operation,
            success,
            objectCount,
        }, 'Audit log: share_push');
        return entry;
    }
    /**
     * Log share pull operation
     */
    logSharePull(context, objectCount, objectTypes, success, errorMessage) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            operation: 'share_pull',
            agreementId: context.agreementId,
            channelId: context.channelId,
            partnerId: context.partnerId,
            userId: context.userId,
            objectCount,
            objectTypes,
            success,
            errorMessage,
            metadata: {
                requestId: context.requestId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            },
        };
        this.auditLogs.push(entry);
        logger.info({
            auditId: entry.id,
            operation: entry.operation,
            success,
            objectCount,
        }, 'Audit log: share_pull');
        return entry;
    }
    /**
     * Log subscription delivery
     */
    logSubscriptionDelivery(context, objectCount, objectTypes, provenanceIds, success, errorMessage) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            operation: 'subscription_deliver',
            agreementId: context.agreementId,
            channelId: context.channelId,
            partnerId: context.partnerId,
            userId: context.userId,
            objectCount,
            objectTypes,
            success,
            errorMessage,
            provenanceIds,
            metadata: {
                requestId: context.requestId,
            },
        };
        this.auditLogs.push(entry);
        logger.info({
            auditId: entry.id,
            operation: entry.operation,
            success,
            objectCount,
        }, 'Audit log: subscription_deliver');
        return entry;
    }
    /**
     * Log agreement creation
     */
    logAgreementCreate(context, agreementId, success, errorMessage) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            operation: 'agreement_create',
            agreementId,
            partnerId: context.partnerId,
            userId: context.userId,
            success,
            errorMessage,
            metadata: {
                requestId: context.requestId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            },
        };
        this.auditLogs.push(entry);
        logger.info({
            auditId: entry.id,
            operation: entry.operation,
            agreementId,
            success,
        }, 'Audit log: agreement_create');
        return entry;
    }
    /**
     * Log agreement modification
     */
    logAgreementModify(context, agreementId, success, errorMessage) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            operation: 'agreement_modify',
            agreementId,
            partnerId: context.partnerId,
            userId: context.userId,
            success,
            errorMessage,
            metadata: {
                requestId: context.requestId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            },
        };
        this.auditLogs.push(entry);
        logger.info({
            auditId: entry.id,
            operation: entry.operation,
            agreementId,
            success,
        }, 'Audit log: agreement_modify');
        return entry;
    }
    /**
     * Query audit logs
     */
    query(filter) {
        let results = this.auditLogs;
        if (filter.startDate) {
            results = results.filter((log) => log.timestamp >= filter.startDate);
        }
        if (filter.endDate) {
            results = results.filter((log) => log.timestamp <= filter.endDate);
        }
        if (filter.operation) {
            results = results.filter((log) => log.operation === filter.operation);
        }
        if (filter.agreementId) {
            results = results.filter((log) => log.agreementId === filter.agreementId);
        }
        if (filter.partnerId) {
            results = results.filter((log) => log.partnerId === filter.partnerId);
        }
        if (filter.userId) {
            results = results.filter((log) => log.userId === filter.userId);
        }
        if (filter.success !== undefined) {
            results = results.filter((log) => log.success === filter.success);
        }
        return results;
    }
    /**
     * Get audit trail for a specific agreement
     */
    getAgreementAuditTrail(agreementId) {
        return this.auditLogs
            .filter((log) => log.agreementId === agreementId)
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    /**
     * Generate audit report
     */
    generateReport(filter) {
        const logs = this.query({
            startDate: filter.startDate,
            endDate: filter.endDate,
        });
        const report = {
            period: {
                start: filter.startDate,
                end: filter.endDate,
            },
            totalOperations: logs.length,
            successfulOperations: logs.filter((l) => l.success).length,
            failedOperations: logs.filter((l) => !l.success).length,
            byOperation: {},
            byAgreement: {},
            byPartner: {},
        };
        // Group by operation
        for (const log of logs) {
            report.byOperation[log.operation] =
                (report.byOperation[log.operation] || 0) + 1;
            if (log.agreementId) {
                report.byAgreement[log.agreementId] =
                    (report.byAgreement[log.agreementId] || 0) + 1;
            }
            if (log.partnerId) {
                report.byPartner[log.partnerId] =
                    (report.byPartner[log.partnerId] || 0) + 1;
            }
        }
        return report;
    }
    /**
     * Export audit logs (for external storage)
     */
    exportLogs(startDate, endDate) {
        return this.query({ startDate, endDate });
    }
    /**
     * Clear audit logs (for testing only)
     */
    clear() {
        this.auditLogs = [];
        logger.warn('Audit logs cleared (testing only)');
    }
}
exports.AuditLogger = AuditLogger;
exports.auditLogger = new AuditLogger();
