"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataRetentionEngine_js_1 = require("../governance/retention/dataRetentionEngine.js");
const scheduler_js_1 = require("../governance/retention/scheduler.js");
const globals_1 = require("@jest/globals");
function createMockPool() {
    return {
        query: globals_1.jest.fn(async () => ({ rows: [], rowCount: 0 })),
    };
}
function createAuditLogger() {
    return {
        log: globals_1.jest.fn(async () => undefined),
    };
}
function createMetadata(overrides = {}) {
    return {
        datasetId: overrides.datasetId ?? `dataset-${Math.random().toString(36).slice(2)}`,
        name: overrides.name ?? 'Test Dataset',
        description: overrides.description,
        dataType: overrides.dataType ?? 'communications',
        containsPersonalData: overrides.containsPersonalData ?? true,
        containsFinancialData: overrides.containsFinancialData ?? false,
        containsHealthData: overrides.containsHealthData ?? false,
        jurisdictions: overrides.jurisdictions ?? ['us'],
        tags: overrides.tags ?? [
            'neo4j:label:TestLabel',
            'postgres:table:test_table',
        ],
        storageSystems: overrides.storageSystems ?? ['neo4j', 'postgres'],
        owner: overrides.owner ?? 'tester@intelgraph.dev',
        createdAt: overrides.createdAt ?? new Date(),
        recordCount: overrides.recordCount,
    };
}
(0, globals_1.describe)('DataRetentionEngine', () => {
    (0, globals_1.it)('applies policy templates automatically during registration', async () => {
        const pool = createMockPool();
        const scheduler = new scheduler_js_1.RetentionScheduler(1000);
        const auditLogger = createAuditLogger();
        const runCypher = globals_1.jest.fn(async () => []);
        const engine = new dataRetentionEngine_js_1.DataRetentionEngine({
            pool,
            scheduler,
            auditLogger,
            runCypher,
        });
        const metadata = createMetadata();
        const record = await engine.registerDataset(metadata, 'tester');
        (0, globals_1.expect)(record.policy.templateId).toBe('pii-365d');
        (0, globals_1.expect)(record.policy.retentionDays).toBe(365);
        const auditCall = auditLogger.log.mock.calls[0]?.[0];
        (0, globals_1.expect)(auditCall.event).toBe('policy.applied');
        scheduler.stop();
    });
    (0, globals_1.it)('prevents purges when a legal hold is active', async () => {
        const pool = createMockPool();
        const scheduler = new scheduler_js_1.RetentionScheduler(1000);
        const auditLogger = createAuditLogger();
        const runCypher = globals_1.jest.fn(async () => []);
        const engine = new dataRetentionEngine_js_1.DataRetentionEngine({
            pool,
            scheduler,
            auditLogger,
            runCypher,
        });
        const metadata = createMetadata({ datasetId: 'legal-hold-test' });
        await engine.registerDataset(metadata, 'tester');
        const legalHold = {
            datasetId: 'legal-hold-test',
            reason: 'Pending litigation',
            requestedBy: 'legal@intelgraph.dev',
            createdAt: new Date(),
            scope: 'full',
        };
        await engine.applyLegalHold('legal-hold-test', legalHold);
        await engine.purgeDataset('legal-hold-test', 'manual');
        (0, globals_1.expect)(auditLogger.log).toHaveBeenCalledWith(globals_1.expect.objectContaining({ event: 'purge.skipped' }));
        scheduler.stop();
    });
    (0, globals_1.it)('executes scheduled purges across storage backends', async () => {
        const pool = createMockPool();
        const scheduler = new scheduler_js_1.RetentionScheduler(5);
        const auditLogger = createAuditLogger();
        const runCypher = globals_1.jest.fn(async () => []);
        const engine = new dataRetentionEngine_js_1.DataRetentionEngine({
            pool,
            scheduler,
            auditLogger,
            runCypher,
        });
        const metadata = createMetadata({
            datasetId: 'scheduled-dataset',
            dataType: 'analytics',
            containsPersonalData: false,
            tags: [
                'neo4j:label:RetentionNode',
                'postgres:table:retention_table',
                'public-intel',
            ],
            storageSystems: ['neo4j', 'postgres'],
        });
        await engine.registerDataset(metadata, 'scheduler');
        await engine.schedulePurge('scheduled-dataset', 10);
        await scheduler.runDueTasks(new Date(Date.now() + 20));
        (0, globals_1.expect)(pool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('DELETE FROM retention_table'), ['scheduled-dataset']);
        (0, globals_1.expect)(runCypher).toHaveBeenCalled();
        scheduler.stop();
    });
    (0, globals_1.it)('generates compliance reports with legal hold visibility', async () => {
        const pool = createMockPool();
        const scheduler = new scheduler_js_1.RetentionScheduler(1000);
        const auditLogger = createAuditLogger();
        const runCypher = globals_1.jest.fn(async () => []);
        const engine = new dataRetentionEngine_js_1.DataRetentionEngine({
            pool,
            scheduler,
            auditLogger,
            runCypher,
        });
        const metadata = createMetadata({ datasetId: 'report-dataset' });
        await engine.registerDataset(metadata, 'compliance');
        await engine.applyLegalHold('report-dataset', {
            datasetId: 'report-dataset',
            reason: 'Regulatory request',
            requestedBy: 'compliance@intelgraph.dev',
            createdAt: new Date(),
            scope: 'full',
        });
        const report = engine.generateComplianceReport(new Date(Date.now() - 1000), new Date(Date.now() + 1000));
        (0, globals_1.expect)(report.totalDatasets).toBeGreaterThanOrEqual(1);
        (0, globals_1.expect)(report.datasetsOnLegalHold).toBeGreaterThanOrEqual(1);
        (0, globals_1.expect)(report.details[0].policyId).toBeDefined();
        scheduler.stop();
    });
    (0, globals_1.it)('archives datasets and records audit events', async () => {
        const pool = createMockPool();
        const scheduler = new scheduler_js_1.RetentionScheduler(1000);
        const auditLogger = createAuditLogger();
        const runCypher = globals_1.jest.fn(async () => []);
        const engine = new dataRetentionEngine_js_1.DataRetentionEngine({
            pool,
            scheduler,
            auditLogger,
            runCypher,
        });
        const metadata = createMetadata({ datasetId: 'archive-dataset' });
        await engine.registerDataset(metadata, 'archiver');
        await engine.archiveDataset('archive-dataset', 'archiver', 'glacier://intelgraph/archive-dataset');
        (0, globals_1.expect)(pool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE data_retention_records'), globals_1.expect.any(Array));
        (0, globals_1.expect)(runCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (n { datasetId: $datasetId })'), globals_1.expect.objectContaining({ datasetId: 'archive-dataset' }));
        (0, globals_1.expect)(auditLogger.log).toHaveBeenCalledWith(globals_1.expect.objectContaining({ event: 'archive.completed' }));
        scheduler.stop();
    });
});
