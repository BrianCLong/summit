import { createHash } from "crypto";
import type {
  AuditEvent,
  CertifiedExportPack,
  ExportManifest,
  MasterRecord,
  RecordVersion,
} from "@intelgraph/mdm-core";

export interface ExportContext {
  recordType: string;
  tenantId: string;
  requestedBy: string;
  recordIds: string[];
}

export class ExportPackBuilder {
  build(
    records: MasterRecord[],
    auditTrail: AuditEvent[],
    versions: RecordVersion[],
    context: ExportContext
  ): CertifiedExportPack {
    const recordHash = this.hashPayload(records);
    const auditTrailHash = this.hashPayload(auditTrail);
    const versionHash = this.hashPayload(versions);

    const manifest: ExportManifest = {
      exportedBy: context.requestedBy,
      exportedAt: new Date(),
      recordType: context.recordType,
      tenantId: context.tenantId,
      recordIds: context.recordIds,
      auditTrailHash,
      versionHash,
      recordHash,
    };

    const packHash = this.hashPayload({ manifest, recordHash, auditTrailHash, versionHash });

    return {
      manifest,
      records,
      auditTrail,
      versions,
      packHash,
    };
  }

  private hashPayload(payload: unknown): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }
}
