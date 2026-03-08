"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogPipeline = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const logEventBus_js_1 = require("./logEventBus.js");
const logRetention_js_1 = require("./logRetention.js");
const defaultRetention = (directory) => ({
    directory,
    retentionDays: Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? '180'),
    compressAfterDays: Number(process.env.AUDIT_LOG_COMPRESS_AFTER_DAYS ?? '7'),
    maxTotalSizeMb: Number(process.env.AUDIT_LOG_TOTAL_SIZE_MB ?? '4096'),
});
class AuditLogPipeline {
    options;
    streamName;
    logDirectory;
    logFilePath;
    recentEvents = [];
    perLevel = {};
    perTenant = {};
    complianceCounts = {};
    totalEvents = 0;
    unsubscribe;
    stopRetention;
    maxRecent;
    logger;
    constructor(options = {}) {
        this.options = options;
        this.streamName = options.streamName ?? process.env.AUDIT_LOG_STREAM ?? 'audit-log';
        this.logDirectory = options.logDir ?? process.env.AUDIT_LOG_DIR ?? path_1.default.join(process.cwd(), 'logs', 'audit');
        this.maxRecent = options.maxRecent ?? 200;
        fs_1.default.mkdirSync(this.logDirectory, { recursive: true });
        this.logFilePath = path_1.default.join(this.logDirectory, `${this.streamName}.jsonl`);
        this.logger =
            options.logger ??
                pino_1.default({
                    name: 'audit-log-pipeline',
                    level: process.env.LOG_LEVEL || 'info',
                });
        const retentionPolicy = options.retentionPolicy ?? defaultRetention(this.logDirectory);
        this.stopRetention = (0, logRetention_js_1.scheduleRetention)(retentionPolicy, this.logger);
        const bus = options.bus ?? logEventBus_js_1.logEventBus;
        this.unsubscribe = bus.subscribe((event) => this.handleEvent(event));
    }
    stop() {
        this.unsubscribe();
        this.stopRetention();
    }
    getDashboardSnapshot() {
        const retentionPolicy = this.options.retentionPolicy ?? defaultRetention(this.logDirectory);
        return {
            stream: this.streamName,
            metrics: {
                totalEvents: this.totalEvents,
                perLevel: { ...this.perLevel },
                perTenant: { ...this.perTenant },
                compliance: { ...this.complianceCounts },
            },
            recentEvents: [...this.recentEvents].reverse(),
            alerts: this.options.alertEngine?.getRecentAlerts() ?? [],
            retention: retentionPolicy,
        };
    }
    handleEvent(event) {
        const record = {
            ...event,
            stream: this.streamName,
            receivedAt: new Date().toISOString(),
            audit: this.extractAuditMetadata(event.context ?? {}),
        };
        this.trackMetrics(record);
        this.persist(record).catch((error) => {
            this.logger.error({ error }, 'Failed to persist audit log record');
        });
    }
    extractAuditMetadata(context) {
        const audit = context.audit ?? {};
        const compliance = context.compliance ?? [];
        return {
            action: audit.action ?? context.action,
            resource: audit.resource ?? context.resource,
            resourceType: audit.resourceType ?? context.resourceType,
            outcome: audit.outcome ?? context.outcome,
            classification: audit.classification ?? context.classification,
            compliance: Array.isArray(compliance) ? compliance.filter(Boolean) : undefined,
            ip: audit.ip ?? context.ip,
            userAgent: audit.userAgent ?? context.userAgent,
        };
    }
    trackMetrics(record) {
        this.totalEvents += 1;
        this.perLevel[record.level] = (this.perLevel[record.level] ?? 0) + 1;
        if (record.tenantId) {
            this.perTenant[record.tenantId] = (this.perTenant[record.tenantId] ?? 0) + 1;
        }
        record.audit?.compliance?.forEach((framework) => {
            this.complianceCounts[framework] = (this.complianceCounts[framework] ?? 0) + 1;
        });
        this.recentEvents.push(record);
        if (this.recentEvents.length > this.maxRecent) {
            this.recentEvents.shift();
        }
    }
    async persist(record) {
        const serialized = JSON.stringify(record);
        await fs_1.default.promises.appendFile(this.logFilePath, `${serialized}\n`, 'utf8');
    }
}
exports.AuditLogPipeline = AuditLogPipeline;
