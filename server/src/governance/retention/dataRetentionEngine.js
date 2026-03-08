"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionEngine = void 0;
const pino_1 = __importDefault(require("pino"));
const neo4j_js_1 = require("../../graph/neo4j.js");
const repository_js_1 = require("./repository.js");
const scheduler_js_1 = require("./scheduler.js");
const policyTemplates_js_1 = require("./policyTemplates.js");
const auditLogger_js_1 = require("./auditLogger.js");
class DataRetentionEngine {
    logger = pino_1.default({ name: 'data-retention-engine' });
    pool;
    repository;
    scheduler;
    auditLogger;
    cypherRunner;
    holdService;
    constructor(options) {
        this.pool = options.pool;
        this.repository =
            options.repository ?? new repository_js_1.DataRetentionRepository(options.pool);
        this.scheduler = options.scheduler ?? new scheduler_js_1.RetentionScheduler();
        this.auditLogger = options.auditLogger ?? new auditLogger_js_1.PinoRetentionAuditLogger();
        this.cypherRunner = options.runCypher ?? neo4j_js_1.runCypher;
        this.holdService = options.holdService;
    }
    listPolicyTemplates() {
        return policyTemplates_js_1.POLICY_TEMPLATE_LIBRARY;
    }
    getRecord(datasetId) {
        return this.repository.getRecord(datasetId);
    }
    classifyDataset(metadata) {
        const { level, rationale } = (0, policyTemplates_js_1.resolveClassification)(metadata);
        const templateSelection = (0, policyTemplates_js_1.selectTemplateForDataset)(metadata);
        return {
            level,
            recommendedTemplateId: templateSelection.template.id,
            rationale,
        };
    }
    async registerDataset(metadata, appliedBy) {
        const { template, rationale } = (0, policyTemplates_js_1.selectTemplateForDataset)(metadata);
        const policy = {
            datasetId: metadata.datasetId,
            templateId: template.id,
            retentionDays: template.retentionDays,
            purgeGraceDays: template.purgeGraceDays,
            legalHoldAllowed: template.legalHoldAllowed,
            storageTargets: template.storageTargets,
            classificationLevel: template.classificationLevel,
            safeguards: template.defaultSafeguards,
            appliedAt: new Date(),
            appliedBy,
        };
        const record = {
            metadata,
            policy,
            legalHold: undefined,
            schedule: undefined,
            archiveHistory: [],
            lastEvaluatedAt: new Date(),
        };
        await this.repository.upsertRecord(record);
        await this.auditLogger.log({
            event: 'policy.applied',
            datasetId: metadata.datasetId,
            policyId: policy.templateId,
            severity: 'info',
            message: `Applied template ${template.id} (${template.name})`,
            metadata: { rationale, appliedBy },
            timestamp: new Date(),
        });
        return record;
    }
    async applyCustomPolicy(datasetId, overrides) {
        const record = this.repository.getRecord(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        const template = (0, policyTemplates_js_1.getPolicyTemplateById)(overrides.templateId ?? record.policy.templateId);
        if (!template) {
            throw new Error(`Unknown retention template ${overrides.templateId}`);
        }
        const policy = {
            ...record.policy,
            ...overrides,
            templateId: template.id,
            retentionDays: overrides.retentionDays ?? template.retentionDays,
            purgeGraceDays: overrides.purgeGraceDays ?? template.purgeGraceDays,
            legalHoldAllowed: overrides.legalHoldAllowed ?? template.legalHoldAllowed,
            storageTargets: overrides.storageTargets ?? template.storageTargets,
            classificationLevel: overrides.classificationLevel ?? template.classificationLevel,
            safeguards: overrides.safeguards ?? template.defaultSafeguards,
            appliedAt: new Date(),
            appliedBy: overrides.appliedBy ?? record.policy.appliedBy,
        };
        await this.repository.updatePolicy(datasetId, policy);
        await this.auditLogger.log({
            event: 'policy.updated',
            datasetId,
            policyId: policy.templateId,
            severity: 'info',
            message: 'Retention policy updated',
            metadata: { overrides },
            timestamp: new Date(),
        });
        return policy;
    }
    async schedulePurge(datasetId, intervalMs) {
        const record = this.repository.getRecord(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        const nextRun = new Date(Date.now() + intervalMs);
        const schedule = {
            datasetId,
            intervalMs,
            nextRun,
            lastRun: record.schedule?.lastRun,
            policyId: record.policy.templateId,
        };
        this.scheduler.register(schedule, async () => {
            await this.purgeDataset(datasetId, 'scheduler');
            const updated = this.scheduler.getSchedule(datasetId);
            if (updated) {
                await this.repository.setSchedule(datasetId, updated);
            }
        });
        this.scheduler.start();
        await this.repository.setSchedule(datasetId, schedule);
        await this.auditLogger.log({
            event: 'purge.scheduled',
            datasetId,
            policyId: record.policy.templateId,
            severity: 'info',
            message: `Scheduled purge every ${intervalMs / 1000} seconds`,
            metadata: { intervalMs },
            timestamp: new Date(),
        });
        return schedule;
    }
    async purgeDataset(datasetId, trigger = 'manual', options = {}) {
        const record = this.repository.getRecord(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        if (record.legalHold) {
            const expiresAt = record.legalHold.expiresAt;
            if (!expiresAt || expiresAt > new Date()) {
                await this.auditLogger.log({
                    event: 'purge.skipped',
                    datasetId,
                    policyId: record.policy.templateId,
                    severity: 'warn',
                    message: 'Purge skipped due to active legal hold',
                    metadata: { trigger, legalHold: record.legalHold },
                    timestamp: new Date(),
                });
                return;
            }
            await this.repository.setLegalHold(datasetId, undefined);
        }
        if (this.holdService?.hasActiveHold(datasetId)) {
            await this.auditLogger.log({
                event: 'purge.skipped',
                datasetId,
                policyId: record.policy.templateId,
                severity: 'warn',
                message: 'Purge blocked by active litigation hold registry entry',
                metadata: { source: 'litigation-hold-service' },
                timestamp: new Date(),
            });
            return;
        }
        await this.performPostgresPurge(record);
        await this.performNeo4jPurge(record);
        if (options.dryRun) {
            return;
        }
        await this.auditLogger.log({
            event: 'purge.executed',
            datasetId,
            policyId: record.policy.templateId,
            severity: 'info',
            message: `Dataset purged via ${trigger}`,
            metadata: { trigger, runId: options.runId, resolved: options.resolvedPolicy },
            timestamp: new Date(),
        });
    }
    async applyLegalHold(datasetId, legalHold) {
        const record = this.repository.getRecord(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        if (!record.policy.legalHoldAllowed && legalHold.scope === 'full') {
            throw new Error('Policy does not allow full legal holds');
        }
        await this.repository.setLegalHold(datasetId, legalHold);
        await this.auditLogger.log({
            event: 'legal-hold.applied',
            datasetId,
            policyId: record.policy.templateId,
            severity: 'warn',
            message: 'Legal hold applied to dataset',
            metadata: { legalHold },
            timestamp: new Date(),
        });
    }
    async releaseLegalHold(datasetId, releasedBy) {
        const record = this.repository.getRecord(datasetId);
        if (!record?.legalHold) {
            return;
        }
        await this.repository.setLegalHold(datasetId, undefined);
        await this.auditLogger.log({
            event: 'legal-hold.released',
            datasetId,
            policyId: record.policy.templateId,
            severity: 'info',
            message: 'Legal hold released',
            metadata: { releasedBy },
            timestamp: new Date(),
        });
    }
    async archiveDataset(datasetId, initiatedBy, targetLocation) {
        const record = this.repository.getRecord(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        const workflow = {
            datasetId,
            initiatedBy,
            initiatedAt: new Date(),
            targetLocation,
            status: 'in-progress',
        };
        await this.repository.appendArchivalEvent(datasetId, workflow);
        try {
            await this.performArchival(record, targetLocation);
            workflow.status = 'completed';
        }
        catch (error) {
            workflow.status = 'failed';
            workflow.details = { error: error.message };
            throw error;
        }
        finally {
            await this.repository.appendArchivalEvent(datasetId, workflow);
        }
        await this.auditLogger.log({
            event: 'archive.completed',
            datasetId,
            policyId: record.policy.templateId,
            severity: workflow.status === 'completed' ? 'info' : 'error',
            message: `Archival workflow ${workflow.status}`,
            metadata: { targetLocation, initiatedBy },
            timestamp: new Date(),
        });
        return workflow;
    }
    generateComplianceReport(start, end) {
        const records = this.repository.getAllRecords();
        const rows = records.map((record) => {
            const schedule = record.schedule;
            const archivedCount = record.archiveHistory.filter((entry) => entry.initiatedAt >= start && entry.initiatedAt <= end).length;
            return {
                datasetId: record.metadata.datasetId,
                datasetName: record.metadata.name,
                classification: record.policy.classificationLevel,
                policyId: record.policy.templateId,
                retentionDays: record.policy.retentionDays,
                onLegalHold: Boolean(record.legalHold &&
                    (!record.legalHold.expiresAt ||
                        record.legalHold.expiresAt > new Date())),
                nextPurge: schedule?.nextRun,
                lastRun: schedule?.lastRun,
                archivedCount,
            };
        });
        const overdueDatasets = rows.filter((row) => {
            if (!row.nextPurge) {
                return false;
            }
            return row.nextPurge < new Date();
        }).length;
        const report = {
            generatedAt: new Date(),
            totalDatasets: rows.length,
            datasetsOnLegalHold: rows.filter((row) => row.onLegalHold).length,
            overdueDatasets,
            archivedInPeriod: rows.reduce((count, row) => count + row.archivedCount, 0),
            details: rows,
        };
        return report;
    }
    async performPostgresPurge(record) {
        if (!record.policy.storageTargets.includes('postgres')) {
            return;
        }
        const tableTags = record.metadata.tags.filter((tag) => tag.startsWith('postgres:table:'));
        const tables = tableTags
            .map((tag) => tag.replace('postgres:table:', ''))
            .filter((table) => /^[a-zA-Z0-9_]+$/.test(table));
        for (const table of tables) {
            try {
                await this.pool.query(`DELETE FROM ${table} WHERE dataset_id = $1 AND (retention_expires_at IS NULL OR retention_expires_at < now())`, [record.metadata.datasetId]);
            }
            catch (error) {
                if (error.code === '42P01') {
                    this.logger.warn({ table }, 'Postgres purge skipped because table is missing.');
                    continue;
                }
                throw error;
            }
        }
    }
    async performNeo4jPurge(record) {
        if (!record.policy.storageTargets.includes('neo4j')) {
            return;
        }
        const labelTags = record.metadata.tags.filter((tag) => tag.startsWith('neo4j:label:'));
        const labels = labelTags
            .map((tag) => tag.replace('neo4j:label:', ''))
            .filter((label) => /^[A-Za-z0-9_]+$/.test(label));
        for (const label of labels) {
            await this.cypherRunner(`MATCH (n:${label} { datasetId: $datasetId })
         WHERE coalesce(n.retentionExpiresAt, datetime()) <= datetime()
         DETACH DELETE n`, { datasetId: record.metadata.datasetId });
        }
    }
    async performArchival(record, targetLocation) {
        if (record.policy.storageTargets.includes('postgres')) {
            try {
                await this.pool.query(`UPDATE data_retention_records
           SET archive_history = coalesce(archive_history, '[]'::jsonb) || $2::jsonb
           WHERE dataset_id = $1`, [
                    record.metadata.datasetId,
                    JSON.stringify({
                        targetLocation,
                        archivedAt: new Date().toISOString(),
                    }),
                ]);
            }
            catch (error) {
                if (error.code !== '42P01') {
                    throw error;
                }
            }
        }
        if (record.policy.storageTargets.includes('neo4j')) {
            await this.cypherRunner(`MATCH (n { datasetId: $datasetId })
         SET n.storageTier = 'archive', n.archivedAt = datetime()`, { datasetId: record.metadata.datasetId });
        }
    }
}
exports.DataRetentionEngine = DataRetentionEngine;
