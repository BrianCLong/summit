import type {
  CertifiedExportPack,
  LegalHold,
  MasterRecord,
  RecordDefinition,
  RecordSearchQuery,
  RetentionPolicy,
  SourceRecord,
} from "@intelgraph/mdm-core";
import {
  GoldenRecordManager,
  type GoldenRecordConfig,
  type GoldenRecordContextOptions,
} from "../manager/golden-record-manager.js";
import { AuditLedger } from "./audit-ledger.js";
import { VersioningService } from "./versioning-service.js";
import { RetentionEngine } from "./retention-engine.js";
import { RecordDefinitionRegistry } from "./record-definition-registry.js";
import { RecordSearchEngine } from "./record-search-engine.js";
import { ExportPackBuilder, type ExportContext } from "./export-pack-builder.js";
import { LegalHoldService } from "./legal-hold-service.js";
import { ROLE_TEMPLATES } from "./role-templates.js";

export interface RecordContext extends GoldenRecordContextOptions {
  recordType: string;
  tenantId: string;
  actor: string;
  reason?: string;
}

export interface RecordComplianceConfig extends Omit<GoldenRecordConfig, "domain"> {
  domain: string;
}

export class RecordCompliancePrimitive {
  private manager: GoldenRecordManager;
  private auditLedger: AuditLedger;
  private versioning: VersioningService;
  private retention: RetentionEngine;
  private definitions: RecordDefinitionRegistry;
  private searchEngine: RecordSearchEngine;
  private exporter: ExportPackBuilder;
  private legalHold: LegalHoldService;

  constructor(
    recordConfig: RecordComplianceConfig,
    definitions: RecordDefinition[],
    retentionPolicies: Array<{
      recordType: string;
      tenantId: string;
      policy: RetentionPolicy;
    }> = [],
    dependencies?: {
      manager?: GoldenRecordManager;
      auditLedger?: AuditLedger;
      versioning?: VersioningService;
      retention?: RetentionEngine;
      searchEngine?: RecordSearchEngine;
      exporter?: ExportPackBuilder;
      legalHold?: LegalHoldService;
    }
  ) {
    this.legalHold = dependencies?.legalHold ?? new LegalHoldService();
    this.manager = dependencies?.manager ?? new GoldenRecordManager(recordConfig);
    this.auditLedger = dependencies?.auditLedger ?? new AuditLedger();
    this.versioning = dependencies?.versioning ?? new VersioningService();
    this.retention = dependencies?.retention ?? new RetentionEngine(this.legalHold);
    this.definitions = new RecordDefinitionRegistry();
    this.searchEngine = dependencies?.searchEngine ?? new RecordSearchEngine();
    this.exporter = dependencies?.exporter ?? new ExportPackBuilder();

    definitions.forEach((def) => this.definitions.register(def));
    retentionPolicies.forEach((entry) =>
      this.retention.registerPolicy(entry.recordType, entry.tenantId, entry.policy)
    );
  }

  getRoleTemplates() {
    return ROLE_TEMPLATES;
  }

  async createRecord(sourceRecords: SourceRecord[], context: RecordContext): Promise<MasterRecord> {
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
      action: "create",
      reason: context.reason,
    });

    return record;
  }

  async updateRecord(
    masterRecordId: string,
    newSourceRecords: SourceRecord[],
    context: RecordContext
  ): Promise<MasterRecord> {
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
      action: "update",
      reason: context.reason,
    });

    return record;
  }

  async mergeRecords(recordIds: string[], context: RecordContext): Promise<MasterRecord> {
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
      action: "merge",
      reason: context.reason,
    });
    return record;
  }

  async accessRecord(recordId: string, actor: string, reason?: string): Promise<MasterRecord> {
    const record = await this.manager.getGoldenRecord(recordId);
    if (!record) {
      throw new Error(`Master record ${recordId} not found`);
    }

    this.auditLedger.recordEvent({
      recordId,
      recordType: record.metadata.recordType ?? "unknown",
      tenantId: record.metadata.tenantId ?? "unknown",
      actor,
      action: "access",
      reason,
    });

    return record;
  }

  applyLegalHold(recordId: string, reason: string, actor: string): LegalHold {
    const record = this.getRecordOrThrow(recordId);
    const hold = this.legalHold.applyHold(
      record.metadata.recordType ?? "unknown",
      record.metadata.tenantId ?? "unknown",
      actor,
      reason,
      "record",
      [recordId]
    );
    this.retention.attachMetadata(record);
    this.auditLedger.recordEvent({
      recordId,
      recordType: record.metadata.recordType ?? "unknown",
      tenantId: record.metadata.tenantId ?? "unknown",
      actor,
      action: "hold_applied",
      reason,
    });
    return hold;
  }

  releaseLegalHold(holdId: string, actor: string): LegalHold {
    const hold = this.legalHold.releaseHold(holdId);
    if (hold.recordIds) {
      hold.recordIds.forEach((recordId) => {
        const record = this.manager.getGoldenRecord(recordId);
        if (record) {
          this.retention.attachMetadata(record);
          this.auditLedger.recordEvent({
            recordId,
            recordType: record.metadata.recordType ?? "unknown",
            tenantId: record.metadata.tenantId ?? "unknown",
            actor,
            action: "hold_released",
            reason: hold.reason,
          });
        }
      });
    }
    return hold;
  }

  configureRetention(recordType: string, tenantId: string, policy: RetentionPolicy): void {
    this.retention.registerPolicy(recordType, tenantId, policy);
  }

  getAuditEvents(recordId: string) {
    return this.auditLedger.getEventsForRecord(recordId);
  }

  getVersions(recordId: string) {
    return this.versioning.getVersions(recordId);
  }

  evaluateRetention(recordId: string) {
    const record = this.getRecordOrThrow(recordId);
    return this.retention.evaluate(record);
  }

  search(query: RecordSearchQuery): MasterRecord[] {
    return this.searchEngine.search(query);
  }

  exportRecords(
    recordIds: string[],
    context: { requestedBy: string; recordType: string; tenantId: string }
  ): CertifiedExportPack {
    const records = recordIds
      .map((id) => this.manager.getGoldenRecord(id))
      .filter((r): r is MasterRecord => Boolean(r));

    const auditTrail = recordIds.flatMap((id) => this.auditLedger.getEventsForRecord(id));
    const versions = recordIds.flatMap((id) => this.versioning.getVersions(id));
    const exportContext: ExportContext = {
      requestedBy: context.requestedBy,
      recordIds,
      recordType: context.recordType,
      tenantId: context.tenantId,
    };

    records.forEach((record) =>
      this.auditLedger.recordEvent({
        recordId: record.id.id,
        recordType: record.metadata.recordType ?? context.recordType,
        tenantId: record.metadata.tenantId ?? context.tenantId,
        actor: context.requestedBy,
        action: "export",
        reason: "certified export pack generated",
      })
    );

    return this.exporter.build(records, auditTrail, versions, exportContext);
  }

  runIntegrityCheck(): { auditChainValid: boolean; versionChecksumsMatch: boolean } {
    const auditChainValid = this.auditLedger.verifyIntegrity();
    const versionChecksumsMatch = this.searchEngine.list().every((record) => {
      const checksumMatches = this.versioning.verifyCurrentData(record.id.id, record.data);
      const latestChecksum = this.versioning.latestChecksum(record.id.id);
      if (latestChecksum) {
        record.metadata.versionChecksum = latestChecksum;
      }
      return checksumMatches;
    });

    return { auditChainValid, versionChecksumsMatch };
  }

  private validateDefinition(recordType: string, sources: SourceRecord[]): void {
    const candidate = sources[0]?.data ?? {};
    this.definitions.validate(recordType, candidate);
  }

  private applyRecordMetadata(record: MasterRecord, context: RecordContext): void {
    record.metadata.recordType = context.recordType;
    record.metadata.tenantId = context.tenantId;
    record.metadata.tags = context.tags ?? record.metadata.tags;
    record.metadata.classifications = context.classifications ?? record.metadata.classifications;
  }

  private getRecordOrThrow(recordId: string): MasterRecord {
    const record = this.manager.getGoldenRecord(recordId);
    if (!record) {
      throw new Error(`Master record ${recordId} not found`);
    }
    return record;
  }
}
