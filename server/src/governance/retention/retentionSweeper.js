"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionSweeper = void 0;
const pino_1 = __importDefault(require("pino"));
const auditLogger_js_1 = require("./auditLogger.js");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
function isLegalHoldActive(record, reference) {
    if (!record.legalHold) {
        return false;
    }
    if (!record.legalHold.expiresAt) {
        return true;
    }
    return record.legalHold.expiresAt > reference;
}
class RetentionSweeper {
    engine;
    repository;
    policyModel;
    auditLogger;
    enforcementEnvVar;
    clock;
    logger = pino_1.default({ name: 'retention-sweeper' });
    timer;
    constructor(options) {
        this.engine = options.engine;
        this.repository = options.repository;
        this.policyModel = options.policyModel;
        this.auditLogger = options.auditLogger ?? new auditLogger_js_1.PinoRetentionAuditLogger();
        this.enforcementEnvVar = options.enforcementEnvVar ?? 'RETENTION_ENFORCEMENT';
        this.clock = options.clock ?? (() => new Date());
    }
    start(intervalMs = 15 * 60 * 1000) {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            void this.run();
        }, intervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async run(options = {}) {
        const dryRun = options.dryRun ?? false;
        const referenceTime = options.referenceTime ?? this.clock();
        const runId = options.runId ?? `sweep-${referenceTime.toISOString().replace(/[:.]/g, '-')}`;
        const enforcementEnabled = process.env[this.enforcementEnvVar] === '1';
        const allowMutations = enforcementEnabled && !dryRun;
        const report = {
            runId,
            dryRun,
            enforcementEnabled,
            marked: [],
            deleted: [],
            skipped: [],
            generatedAt: referenceTime,
        };
        const records = this.repository
            .getAllRecords()
            .slice()
            .sort((a, b) => a.metadata.datasetId.localeCompare(b.metadata.datasetId));
        if (!enforcementEnabled && !dryRun) {
            report.skipped.push({
                datasetId: '*',
                reason: 'enforcement-disabled',
            });
            return report;
        }
        for (const record of records) {
            if (isLegalHoldActive(record, referenceTime)) {
                report.skipped.push({
                    datasetId: record.metadata.datasetId,
                    reason: 'legal-hold',
                });
                continue;
            }
            const resolved = this.policyModel.resolve(record);
            const expiresAt = new Date(record.metadata.createdAt.getTime() + resolved.retentionDays * MS_PER_DAY);
            const deleteAfter = new Date(expiresAt.getTime() + resolved.purgeGraceDays * MS_PER_DAY);
            if (!record.pendingDeletion && referenceTime >= expiresAt) {
                const pending = {
                    runId,
                    markedAt: referenceTime,
                    executeAfter: deleteAfter,
                    reason: 'retention-expired',
                    resolvedPolicy: resolved,
                };
                const row = {
                    datasetId: record.metadata.datasetId,
                    policySource: resolved.source,
                    executeAfter: pending.executeAfter,
                    reason: pending.reason,
                };
                if (allowMutations) {
                    await this.repository.markPendingDeletion(record.metadata.datasetId, pending);
                    await this.auditLogger.log({
                        event: 'deletion.marked',
                        datasetId: record.metadata.datasetId,
                        policyId: resolved.appliedPolicyId ?? record.policy.templateId,
                        severity: 'info',
                        message: 'Dataset marked for deletion after grace period',
                        metadata: {
                            runId,
                            executeAfter: pending.executeAfter,
                            policySource: resolved.source,
                            appliedLayers: resolved.appliedLayers,
                        },
                        timestamp: referenceTime,
                    });
                }
                report.marked.push(row);
                continue;
            }
            if (record.pendingDeletion &&
                referenceTime >= record.pendingDeletion.executeAfter) {
                const row = {
                    datasetId: record.metadata.datasetId,
                    policySource: record.pendingDeletion.resolvedPolicy.source,
                    executeAfter: record.pendingDeletion.executeAfter,
                    reason: record.pendingDeletion.reason,
                };
                if (allowMutations) {
                    await this.engine.purgeDataset(record.metadata.datasetId, 'scheduler', {
                        runId,
                        resolvedPolicy: record.pendingDeletion.resolvedPolicy,
                    });
                    await this.repository.deleteRecord(record.metadata.datasetId);
                    await this.auditLogger.log({
                        event: 'deletion.executed',
                        datasetId: record.metadata.datasetId,
                        policyId: record.pendingDeletion.resolvedPolicy.appliedPolicyId ??
                            record.policy.templateId,
                        severity: 'info',
                        message: 'Dataset hard-deleted by retention sweeper',
                        metadata: {
                            runId,
                            policySource: record.pendingDeletion.resolvedPolicy.source,
                            appliedLayers: record.pendingDeletion.resolvedPolicy.appliedLayers ?? [],
                        },
                        timestamp: referenceTime,
                    });
                }
                report.deleted.push(row);
            }
        }
        return report;
    }
}
exports.RetentionSweeper = RetentionSweeper;
