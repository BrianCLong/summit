"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeRetentionAuditLogger = exports.AdvancedAuditSystemAdapter = exports.PinoRetentionAuditLogger = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'data-retention' });
class PinoRetentionAuditLogger {
    async log(event) {
        const logMethod = event.severity === 'error'
            ? logger.error.bind(logger)
            : event.severity === 'warn'
                ? logger.warn.bind(logger)
                : logger.info.bind(logger);
        logMethod({
            datasetId: event.datasetId,
            policyId: event.policyId,
            metadata: event.metadata,
        }, event.message);
    }
}
exports.PinoRetentionAuditLogger = PinoRetentionAuditLogger;
class AdvancedAuditSystemAdapter {
    auditSystem;
    constructor(auditSystem) {
        this.auditSystem = auditSystem;
    }
    async log(event) {
        await this.auditSystem.recordEvent({
            eventType: `retention.${event.event}`,
            level: event.severity === 'error'
                ? 'error'
                : event.severity === 'warn'
                    ? 'warn'
                    : 'info',
            tenantId: event.metadata?.tenantId || 'global',
            serviceId: 'data-retention-engine',
            action: event.event,
            outcome: event.severity === 'error' ? 'failure' : 'success',
            message: event.message,
            details: {
                datasetId: event.datasetId,
                policyId: event.policyId,
                ...event.metadata,
            },
            complianceRelevant: true,
            complianceFrameworks: ['SOC2', 'GDPR'],
            correlationId: event.metadata?.correlationId || event.datasetId,
            userId: event.metadata?.userId,
            resourceType: event.metadata?.resourceType || 'dataset',
            resourceId: event.datasetId,
        });
    }
}
exports.AdvancedAuditSystemAdapter = AdvancedAuditSystemAdapter;
class CompositeRetentionAuditLogger {
    loggers;
    constructor(...loggers) {
        this.loggers = loggers;
    }
    async log(event) {
        await Promise.all(this.loggers.map((logger) => logger.log(event)));
    }
}
exports.CompositeRetentionAuditLogger = CompositeRetentionAuditLogger;
