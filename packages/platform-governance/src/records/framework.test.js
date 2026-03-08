"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const framework_js_1 = require("./framework.js");
const engine_js_1 = require("../retention/engine.js");
const baseMetadata = framework_js_1.RecordMetadataSchema.parse({
    owner: 'investigations-team',
    classification: 'confidential',
    retentionClass: 'casefiles',
    provenance: { source: 'ingest-service', transforms: [], exports: [] },
    tags: ['custodian-123'],
});
(0, vitest_1.describe)('RecordFramework', () => {
    (0, vitest_1.it)('creates records, versions, and exports bundles with integrity guarantees', () => {
        const framework = (0, framework_js_1.createRecordFramework)();
        framework.registerDomain({ domain: 'event', requiredFields: ['actor', 'action'] });
        framework.registerTemplate({
            id: 'audit-event',
            name: 'Audit Event',
            description: 'Standard audit record',
            domain: 'event',
            defaultMetadata: baseMetadata,
            requiredFields: ['actor', 'action'],
        });
        const record = framework.applyTemplate('audit-event', {
            data: { actor: 'alice', action: 'login' },
            createdBy: 'alice',
        });
        (0, vitest_1.expect)(record.metadata.templateId).toBe('audit-event');
        const version = framework.appendVersion(record.id, { actor: 'alice', action: 'logout' }, 'alice', 'session end');
        (0, vitest_1.expect)(version.diff?.action).toEqual({ before: 'login', after: 'logout' });
        const searchResults = framework.search({ classification: 'confidential', domain: 'event' });
        (0, vitest_1.expect)(searchResults).toHaveLength(1);
        const bundle = framework.exportBundle([record.id]);
        (0, vitest_1.expect)(bundle.manifest[0].hash).toBe(record.versions.at(-1)?.hash);
        (0, vitest_1.expect)(bundle.bundleHash).toBeDefined();
        const violations = framework.verifyIntegrity(record.id);
        (0, vitest_1.expect)(violations).toHaveLength(0);
        (0, vitest_1.expect)(framework.getAuditTrail().verifyChain()).toBe(true);
        const integrityRun = framework.runIntegrityJob();
        (0, vitest_1.expect)(integrityRun.violations).toHaveLength(0);
        (0, vitest_1.expect)(framework.getIntegrityStatus()).toEqual(integrityRun);
    });
    (0, vitest_1.it)('enforces append-only protections and scoped access controls', () => {
        const framework = (0, framework_js_1.createRecordFramework)();
        const scoped = (0, framework_js_1.createScopedRecordApi)(framework, {
            allowedDomains: ['file'],
            allowedClassifications: ['confidential'],
            owners: ['investigations-team'],
        });
        const record = scoped.create({
            domain: 'file',
            type: 'Export Artifact',
            immutability: 'append-only',
            metadata: baseMetadata,
            data: { uri: 's3://bucket/doc.pdf' },
            createdBy: 'analyst',
        });
        (0, vitest_1.expect)(() => scoped.append(record.id, { uri: 's3://bucket/doc2.pdf' }, 'analyst')).toThrow(/Append-only records cannot modify existing fields/);
        (0, vitest_1.expect)(() => (0, framework_js_1.createScopedRecordApi)(framework, { allowedDomains: ['object'] }).append(record.id, { uri: 'x' }, 'user')).toThrow('Domain not permitted for actor');
    });
});
(0, vitest_1.describe)('RetentionEngine', () => {
    (0, vitest_1.it)('enforces policies, legal holds, and DSAR propagation', () => {
        const framework = (0, framework_js_1.createRecordFramework)();
        const retention = (0, engine_js_1.createRetentionEngine)(framework);
        retention.registerDefault('casefiles', engine_js_1.RetentionPolicySchema.parse({
            id: 'default-casefile',
            recordType: 'Audit Event',
            tier: 'regulatory',
            durationDays: 0,
            deletionMode: 'soft',
            propagateToDerived: true,
        }));
        const parent = framework.createRecord({
            domain: 'object',
            type: 'Case Note',
            immutability: 'versioned',
            metadata: baseMetadata,
            data: { note: 'sensitive', subject: 'custodian-123' },
            createdBy: 'analyst',
        });
        const child = framework.createRecord({
            domain: 'file',
            type: 'Export Artifact',
            immutability: 'append-only',
            metadata: { ...baseMetadata, tags: ['custodian-123', 'derived'] },
            data: { uri: 's3://bucket/doc.pdf' },
            createdBy: 'analyst',
            lineage: { parents: [parent.id] },
        });
        framework.addChild(parent.id, child.id);
        retention.placeLegalHold({
            id: 'hold-1',
            reason: 'investigation',
            scope: { recordIds: [parent.id], recordTypes: [] },
            createdBy: 'compliance',
        });
        const preview = retention.previewDeletion(new Date(Date.now() + 86400000));
        (0, vitest_1.expect)(preview.blockedByHold).toContain(parent.id);
        const result = retention.executeDeletion('compliance-bot', preview);
        (0, vitest_1.expect)(result.deleted).toContain(child.id);
        (0, vitest_1.expect)(result.skipped).toContain(parent.id);
        const dsar = retention.dsar('custodian-123');
        const ids = dsar.records.map(r => r.id);
        (0, vitest_1.expect)(ids).toEqual(vitest_1.expect.arrayContaining([parent.id, child.id]));
        (0, vitest_1.expect)(dsar.propagation).toEqual(vitest_1.expect.arrayContaining([child.id, parent.id]));
        const report = retention.report(new Date(Date.now() + 86400000 * 2));
        (0, vitest_1.expect)(report.policyCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(report.blockedRecords).toContain(parent.id);
    });
});
