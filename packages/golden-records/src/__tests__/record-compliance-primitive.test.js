"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const zod_1 = require("zod");
const audit_ledger_js_1 = require("../compliance/audit-ledger.js");
const record_compliance_primitive_js_1 = require("../compliance/record-compliance-primitive.js");
const legal_hold_service_js_1 = require("../compliance/legal-hold-service.js");
const retention_engine_js_1 = require("../compliance/retention-engine.js");
const recordDefinition = {
    type: 'case_record',
    description: 'Case management record',
    schema: zod_1.z.object({
        name: zod_1.z.string(),
        status: zod_1.z.string(),
    }),
    classification: 'restricted',
    retentionPolicy: { name: 'default', retentionDays: 30, deleteOnExpiry: false },
};
const goldenConfig = {
    domain: 'cases',
    survivorshipRules: [
        { attributeName: 'status', strategy: 'most_recent', priority: 1 },
        { attributeName: 'name', strategy: 'most_trusted_source', priority: 1 },
    ],
    enableVersioning: true,
    enableLineageTracking: true,
};
function buildSourceRecord(overrides = {}) {
    return {
        sourceId: 'src-1',
        sourceSystem: 'crm',
        sourceRecordId: '1',
        data: { name: 'Case A', status: 'open' },
        lastModified: new Date(),
        confidence: 0.9,
        priority: 10,
        ...overrides,
    };
}
describe('RecordCompliancePrimitive', () => {
    it('creates and updates records with audit trails and versions', async () => {
        const primitive = new record_compliance_primitive_js_1.RecordCompliancePrimitive(goldenConfig, [recordDefinition], [{ recordType: recordDefinition.type, tenantId: 'tenant-1', policy: recordDefinition.retentionPolicy }]);
        const record = await primitive.createRecord([buildSourceRecord()], { recordType: recordDefinition.type, tenantId: 'tenant-1', actor: 'alice', reason: 'initial load' });
        expect(record.metadata.recordType).toBe(recordDefinition.type);
        expect(primitive.getAuditEvents(record.id.id)).toHaveLength(1);
        const updated = await primitive.updateRecord(record.id.id, [buildSourceRecord({ data: { name: 'Case A', status: 'closed' }, lastModified: (0, date_fns_1.addDays)(new Date(), 1) })], { recordType: recordDefinition.type, tenantId: 'tenant-1', actor: 'bob', reason: 'status change' });
        expect(updated.version).toBe(2);
        const versions = primitive.getVersions(record.id.id);
        expect(versions).toHaveLength(2);
        expect(versions[1]?.diff?.status?.current).toBe('closed');
        const integrity = primitive.runIntegrityCheck();
        expect(integrity.auditChainValid).toBe(true);
        expect(integrity.versionChecksumsMatch).toBe(true);
    });
    it('blocks expiry when a legal hold is applied', async () => {
        const legalHold = new legal_hold_service_js_1.LegalHoldService();
        const retention = new retention_engine_js_1.RetentionEngine(legalHold);
        const primitive = new record_compliance_primitive_js_1.RecordCompliancePrimitive(goldenConfig, [recordDefinition], [{ recordType: recordDefinition.type, tenantId: 'tenant-2', policy: { name: 'short', retentionDays: 1, deleteOnExpiry: true } }], { legalHold, retention });
        const record = await primitive.createRecord([buildSourceRecord({ sourceRecordId: '2', lastModified: (0, date_fns_1.addDays)(new Date(), -40) })], { recordType: recordDefinition.type, tenantId: 'tenant-2', actor: 'alice' });
        record.createdAt = (0, date_fns_1.addDays)(new Date(), -40);
        primitive.applyLegalHold(record.id.id, 'investigation', 'records_officer');
        const evaluation = primitive.evaluateRetention(record.id.id);
        expect(evaluation.holds.length).toBe(1);
        expect(evaluation.expired).toBe(false);
    });
    it('builds certified export packs with stable hashes', async () => {
        const primitive = new record_compliance_primitive_js_1.RecordCompliancePrimitive(goldenConfig, [recordDefinition], [{ recordType: recordDefinition.type, tenantId: 'tenant-3', policy: recordDefinition.retentionPolicy }]);
        const record = await primitive.createRecord([buildSourceRecord({ sourceRecordId: '3' })], { recordType: recordDefinition.type, tenantId: 'tenant-3', actor: 'carol' });
        const pack = primitive.exportRecords([record.id.id], {
            requestedBy: 'auditor',
            recordType: recordDefinition.type,
            tenantId: 'tenant-3',
        });
        expect(pack.manifest.recordIds).toContain(record.id.id);
        expect(pack.packHash).toBeDefined();
        const recomputed = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({
            manifest: pack.manifest,
            recordHash: pack.manifest.recordHash,
            auditTrailHash: pack.manifest.auditTrailHash,
            versionHash: pack.manifest.versionHash,
        }))
            .digest('hex');
        expect(pack.packHash).toBe(recomputed);
    });
});
describe('AuditLedger', () => {
    it('detects tampering via hash chain', () => {
        const ledger = new audit_ledger_js_1.AuditLedger();
        ledger.recordEvent({
            recordId: '1',
            recordType: 'case_record',
            tenantId: 'tenant-1',
            actor: 'alice',
            action: 'create',
        });
        const event = ledger.recordEvent({
            recordId: '1',
            recordType: 'case_record',
            tenantId: 'tenant-1',
            actor: 'bob',
            action: 'update',
        });
        expect(ledger.verifyIntegrity()).toBe(true);
        // Tamper with the second event
        event.actor = 'mallory';
        expect(ledger.verifyIntegrity()).toBe(false);
    });
});
