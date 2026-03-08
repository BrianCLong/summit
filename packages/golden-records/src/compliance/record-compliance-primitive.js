"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordCompliancePrimitive = void 0;
const golden_record_manager_js_1 = require("../manager/golden-record-manager.js");
const audit_ledger_js_1 = require("./audit-ledger.js");
const versioning_service_js_1 = require("./versioning-service.js");
const retention_engine_js_1 = require("./retention-engine.js");
const record_definition_registry_js_1 = require("./record-definition-registry.js");
const record_search_engine_js_1 = require("./record-search-engine.js");
const export_pack_builder_js_1 = require("./export-pack-builder.js");
const legal_hold_service_js_1 = require("./legal-hold-service.js");
const role_templates_js_1 = require("./role-templates.js");
class RecordCompliancePrimitive {
    manager;
    auditLedger;
    versioning;
    retention;
    definitions;
    searchEngine;
    exporter;
    legalHold;
    constructor(recordConfig, definitions, retentionPolicies = [], dependencies) {
        this.legalHold = dependencies?.legalHold ?? new legal_hold_service_js_1.LegalHoldService();
        this.manager = dependencies?.manager ?? new golden_record_manager_js_1.GoldenRecordManager(recordConfig);
        this.auditLedger = dependencies?.auditLedger ?? new audit_ledger_js_1.AuditLedger();
        this.versioning = dependencies?.versioning ?? new versioning_service_js_1.VersioningService();
        this.retention = dependencies?.retention ?? new retention_engine_js_1.RetentionEngine(this.legalHold);
        this.definitions = new record_definition_registry_js_1.RecordDefinitionRegistry();
        this.searchEngine = dependencies?.searchEngine ?? new record_search_engine_js_1.RecordSearchEngine();
        this.exporter = dependencies?.exporter ?? new export_pack_builder_js_1.ExportPackBuilder();
        definitions.forEach(def => this.definitions.register(def));
        retentionPolicies.forEach(entry => this.retention.registerPolicy(entry.recordType, entry.tenantId, entry.policy));
    }
    getRoleTemplates() {
        return role_templates_js_1.ROLE_TEMPLATES;
    }
    async createRecord(sourceRecords, context) {
        this.validateDefinition(context.recordType, sourceRecords);
        const record = await this.manager.createGoldenRecord(sourceRecords, context);
        this.definitions.validate(context.recordType, record.data);
        this.applyRecordMetadata(record, context);
        this.versioning.recordVersion(record, context.actor);
        this.retention.attachMetadata(record);
        this.searchEngine.index(record);
        this.auditLedger.recordEvent({
            recordId: record.id.id,
            recordType: context.recordType,
            tenantId: context.tenantId,
            actor: context.actor,
            action: 'create',
            reason: context.reason,
        });
        return record;
    }
    async updateRecord(masterRecordId, newSourceRecords, context) {
        const record = await this.manager.updateGoldenRecord(masterRecordId, newSourceRecords, context);
        this.definitions.validate(context.recordType, record.data);
        this.applyRecordMetadata(record, context);
        this.versioning.recordVersion(record, context.actor);
        this.retention.attachMetadata(record);
        this.searchEngine.index(record);
        this.auditLedger.recordEvent({
            recordId: record.id.id,
            recordType: context.recordType,
            tenantId: context.tenantId,
            actor: context.actor,
            action: 'update',
            reason: context.reason,
        });
        return record;
    }
    async mergeRecords(recordIds, context) {
        const record = await this.manager.mergeGoldenRecords(recordIds, context.actor);
        this.applyRecordMetadata(record, context);
        this.versioning.recordVersion(record, context.actor);
        this.retention.attachMetadata(record);
        this.searchEngine.index(record);
        this.auditLedger.recordEvent({
            recordId: record.id.id,
            recordType: context.recordType,
            tenantId: context.tenantId,
            actor: context.actor,
            action: 'merge',
            reason: context.reason,
        });
        return record;
    }
    async accessRecord(recordId, actor, reason) {
        const record = await this.manager.getGoldenRecord(recordId);
        if (!record) {
            throw new Error(`Master record ${recordId} not found`);
        }
        this.auditLedger.recordEvent({
            recordId,
            recordType: record.metadata.recordType ?? 'unknown',
            tenantId: record.metadata.tenantId ?? 'unknown',
            actor,
            action: 'access',
            reason,
        });
        return record;
    }
    applyLegalHold(recordId, reason, actor) {
        const record = this.getRecordOrThrow(recordId);
        const hold = this.legalHold.applyHold(record.metadata.recordType ?? 'unknown', record.metadata.tenantId ?? 'unknown', actor, reason, 'record', [recordId]);
        this.retention.attachMetadata(record);
        this.auditLedger.recordEvent({
            recordId,
            recordType: record.metadata.recordType ?? 'unknown',
            tenantId: record.metadata.tenantId ?? 'unknown',
            actor,
            action: 'hold_applied',
            reason,
        });
        return hold;
    }
    releaseLegalHold(holdId, actor) {
        const hold = this.legalHold.releaseHold(holdId);
        if (hold.recordIds) {
            hold.recordIds.forEach(recordId => {
                const record = this.manager.getGoldenRecord(recordId);
                if (record) {
                    this.retention.attachMetadata(record);
                    this.auditLedger.recordEvent({
                        recordId,
                        recordType: record.metadata.recordType ?? 'unknown',
                        tenantId: record.metadata.tenantId ?? 'unknown',
                        actor,
                        action: 'hold_released',
                        reason: hold.reason,
                    });
                }
            });
        }
        return hold;
    }
    configureRetention(recordType, tenantId, policy) {
        this.retention.registerPolicy(recordType, tenantId, policy);
    }
    getAuditEvents(recordId) {
        return this.auditLedger.getEventsForRecord(recordId);
    }
    getVersions(recordId) {
        return this.versioning.getVersions(recordId);
    }
    evaluateRetention(recordId) {
        const record = this.getRecordOrThrow(recordId);
        return this.retention.evaluate(record);
    }
    search(query) {
        return this.searchEngine.search(query);
    }
    exportRecords(recordIds, context) {
        const records = recordIds
            .map(id => this.manager.getGoldenRecord(id))
            .filter((r) => Boolean(r));
        const auditTrail = recordIds.flatMap(id => this.auditLedger.getEventsForRecord(id));
        const versions = recordIds.flatMap(id => this.versioning.getVersions(id));
        const exportContext = {
            requestedBy: context.requestedBy,
            recordIds,
            recordType: context.recordType,
            tenantId: context.tenantId,
        };
        records.forEach(record => this.auditLedger.recordEvent({
            recordId: record.id.id,
            recordType: record.metadata.recordType ?? context.recordType,
            tenantId: record.metadata.tenantId ?? context.tenantId,
            actor: context.requestedBy,
            action: 'export',
            reason: 'certified export pack generated',
        }));
        return this.exporter.build(records, auditTrail, versions, exportContext);
    }
    runIntegrityCheck() {
        const auditChainValid = this.auditLedger.verifyIntegrity();
        const versionChecksumsMatch = this.searchEngine.list().every(record => {
            const checksumMatches = this.versioning.verifyCurrentData(record.id.id, record.data);
            const latestChecksum = this.versioning.latestChecksum(record.id.id);
            if (latestChecksum) {
                record.metadata.versionChecksum = latestChecksum;
            }
            return checksumMatches;
        });
        return { auditChainValid, versionChecksumsMatch };
    }
    validateDefinition(recordType, sources) {
        const candidate = sources[0]?.data ?? {};
        this.definitions.validate(recordType, candidate);
    }
    applyRecordMetadata(record, context) {
        record.metadata.recordType = context.recordType;
        record.metadata.tenantId = context.tenantId;
        record.metadata.tags = context.tags ?? record.metadata.tags;
        record.metadata.classifications = context.classifications ?? record.metadata.classifications;
    }
    getRecordOrThrow(recordId) {
        const record = this.manager.getGoldenRecord(recordId);
        if (!record) {
            throw new Error(`Master record ${recordId} not found`);
        }
        return record;
    }
}
exports.RecordCompliancePrimitive = RecordCompliancePrimitive;
