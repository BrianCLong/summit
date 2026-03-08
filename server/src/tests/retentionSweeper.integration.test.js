"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dataRetentionEngine_js_1 = require("../governance/retention/dataRetentionEngine.js");
const repository_js_1 = require("../governance/retention/repository.js");
const scheduler_js_1 = require("../governance/retention/scheduler.js");
const policyModel_js_1 = require("../governance/retention/policyModel.js");
const retentionSweeper_js_1 = require("../governance/retention/retentionSweeper.js");
const fixedNow = new Date('2024-01-31T00:00:00.000Z');
function mockPool() {
    return {
        query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
}
function mockAudit() {
    return {
        log: globals_1.jest.fn().mockResolvedValue(undefined),
    };
}
function baseRecord(datasetId, overrides = {}) {
    return {
        metadata: {
            datasetId,
            name: datasetId,
            dataType: 'analytics',
            containsPersonalData: false,
            jurisdictions: ['us'],
            tags: ['postgres:table:records'],
            storageSystems: ['postgres'],
            owner: 'tester',
            createdAt: new Date('2023-12-01T00:00:00.000Z'),
            tenantId: 'tenant-1',
            caseId: 'case-1',
            evidenceType: 'video',
            ...(overrides.metadata || {}),
        },
        policy: {
            datasetId,
            templateId: 'base-template',
            retentionDays: 90,
            purgeGraceDays: 10,
            legalHoldAllowed: true,
            storageTargets: ['postgres'],
            classificationLevel: 'internal',
            safeguards: [],
            appliedAt: new Date('2023-12-01T00:00:00.000Z'),
            appliedBy: 'system',
            ...(overrides.policy || {}),
        },
        archiveHistory: [],
        lastEvaluatedAt: fixedNow,
        ...overrides,
    };
}
(0, globals_1.describe)('RetentionSweeper integration', () => {
    let pool;
    let repository;
    let auditLogger;
    let scheduler;
    let engine;
    let policyModel;
    (0, globals_1.beforeEach)(() => {
        pool = mockPool();
        repository = new repository_js_1.DataRetentionRepository(pool);
        auditLogger = mockAudit();
        scheduler = new scheduler_js_1.RetentionScheduler(5);
        engine = new dataRetentionEngine_js_1.DataRetentionEngine({
            pool,
            repository,
            scheduler,
            auditLogger,
            runCypher: globals_1.jest.fn().mockResolvedValue([]),
        });
        policyModel = new policyModel_js_1.RetentionPolicyModel({
            tenants: [
                {
                    tenantId: 'tenant-1',
                    retentionDays: 45,
                    purgeGraceDays: 3,
                    updatedAt: new Date('2023-11-01T00:00:00.000Z'),
                    updatedBy: 'ops',
                },
            ],
            cases: [
                {
                    tenantId: 'tenant-1',
                    caseId: 'case-1',
                    retentionDays: 25,
                    purgeGraceDays: 2,
                    updatedAt: new Date('2023-11-02T00:00:00.000Z'),
                    updatedBy: 'ops',
                    reason: 'Legal team shortened window',
                },
            ],
            evidenceTypes: [
                {
                    tenantId: 'tenant-1',
                    evidenceType: 'video',
                    retentionDays: 10,
                    purgeGraceDays: 1,
                    updatedAt: new Date('2023-11-03T00:00:00.000Z'),
                    updatedBy: 'legal',
                    reason: 'Transient captures',
                },
            ],
        });
    });
    (0, globals_1.afterEach)(() => {
        delete process.env.RETENTION_ENFORCEMENT;
        scheduler.stop();
    });
    (0, globals_1.it)('produces deterministic dry-run reports with mixed fixtures', async () => {
        process.env.RETENTION_ENFORCEMENT = '0';
        const sweeper = new retentionSweeper_js_1.RetentionSweeper({
            engine,
            repository,
            policyModel,
            auditLogger,
            clock: () => fixedNow,
        });
        await repository.upsertRecord(baseRecord('ds-video-expired', {
            metadata: { evidenceType: 'video' },
        }));
        await repository.upsertRecord(baseRecord('ds-case-only', {
            metadata: { evidenceType: 'document' },
        }));
        await repository.upsertRecord(baseRecord('ds-legal-hold', {
            legalHold: {
                datasetId: 'ds-legal-hold',
                reason: 'Litigation',
                requestedBy: 'legal',
                createdAt: fixedNow,
                expiresAt: new Date('2024-12-31T00:00:00.000Z'),
                scope: 'full',
            },
        }));
        const report = await sweeper.run({
            dryRun: true,
            runId: 'dry-run-001',
            referenceTime: fixedNow,
        });
        (0, globals_1.expect)(report).toMatchInlineSnapshot(`
{
  "deleted": [],
  "dryRun": true,
  "enforcementEnabled": false,
  "generatedAt": 2024-01-31T00:00:00.000Z,
  "marked": [
    {
      "datasetId": "ds-case-only",
      "executeAfter": 2023-12-28T00:00:00.000Z,
      "policySource": "case-override",
      "reason": "retention-expired",
    },
    {
      "datasetId": "ds-video-expired",
      "executeAfter": 2023-12-12T00:00:00.000Z,
      "policySource": "evidence-type-override",
      "reason": "retention-expired",
    },
  ],
  "runId": "dry-run-001",
  "skipped": [
    {
      "datasetId": "ds-legal-hold",
      "reason": "legal-hold",
    },
  ],
}
`);
    });
    (0, globals_1.it)('marks expired datasets for deletion and then hard-deletes after grace', async () => {
        process.env.RETENTION_ENFORCEMENT = '1';
        const sweeper = new retentionSweeper_js_1.RetentionSweeper({
            engine,
            repository,
            policyModel,
            auditLogger,
            clock: () => fixedNow,
        });
        const record = baseRecord('ds-expired', {
            metadata: { evidenceType: 'video' },
        });
        await repository.upsertRecord(record);
        const firstRun = await sweeper.run({ runId: 'run-mark', referenceTime: fixedNow });
        const stored = repository.getRecord('ds-expired');
        (0, globals_1.expect)(firstRun.marked).toHaveLength(1);
        (0, globals_1.expect)(stored?.pendingDeletion?.runId).toBe('run-mark');
        const auditEvents = auditLogger.log.mock.calls.map((call) => call[0].event);
        (0, globals_1.expect)(auditEvents).toContain('deletion.marked');
        const secondReference = new Date((stored?.pendingDeletion?.executeAfter ?? fixedNow).getTime() + 60 * 1000);
        const secondRun = await sweeper.run({
            runId: 'run-delete',
            referenceTime: secondReference,
        });
        const deleteCall = pool.query.mock.calls.find(([sql]) => sql.includes('DELETE FROM records'));
        (0, globals_1.expect)(deleteCall?.[0]).toContain('DELETE FROM records');
        (0, globals_1.expect)(secondRun.deleted[0].datasetId).toBe('ds-expired');
        (0, globals_1.expect)(repository.getRecord('ds-expired')).toBeUndefined();
        (0, globals_1.expect)(auditLogger.log.mock.calls.some((call) => call[0].event === 'deletion.executed')).toBe(true);
    });
    (0, globals_1.it)('honors legal holds even when enforcement is enabled', async () => {
        process.env.RETENTION_ENFORCEMENT = '1';
        const sweeper = new retentionSweeper_js_1.RetentionSweeper({
            engine,
            repository,
            policyModel,
            auditLogger,
            clock: () => fixedNow,
        });
        await repository.upsertRecord(baseRecord('ds-held', {
            legalHold: {
                datasetId: 'ds-held',
                reason: 'Active investigation',
                requestedBy: 'legal',
                createdAt: fixedNow,
                scope: 'full',
            },
        }));
        const report = await sweeper.run({ runId: 'run-hold', referenceTime: fixedNow });
        (0, globals_1.expect)(report.marked).toHaveLength(0);
        (0, globals_1.expect)(report.deleted).toHaveLength(0);
        (0, globals_1.expect)(report.skipped[0]).toEqual({
            datasetId: 'ds-held',
            reason: 'legal-hold',
        });
    });
});
