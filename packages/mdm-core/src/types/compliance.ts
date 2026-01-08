import { z } from "zod";
import type { MasterRecord } from "./master-record.js";

export type AuditEventAction =
  | "create"
  | "update"
  | "merge"
  | "access"
  | "delete"
  | "hold_applied"
  | "hold_released"
  | "export";

export interface AuditEvent {
  id: string;
  recordId: string;
  recordType: string;
  tenantId: string;
  actor: string;
  action: AuditEventAction;
  timestamp: Date;
  reason?: string;
  prevHash?: string;
  hash: string;
  metadata?: Record<string, unknown>;
}

export interface RetentionPolicy {
  name: string;
  retentionDays: number;
  deleteOnExpiry: boolean;
  purgeGraceDays?: number;
  enforceLegalHold?: boolean;
}

export interface LegalHold {
  id: string;
  recordType: string;
  tenantId: string;
  scope: "record" | "type" | "tenant";
  recordIds?: string[];
  appliedBy: string;
  reason: string;
  createdAt: Date;
  releasedAt?: Date;
}

export interface RecordVersion<TData = Record<string, unknown>> {
  version: number;
  recordId: string;
  recordType: string;
  tenantId: string;
  data: TData;
  checksum: string;
  timestamp: Date;
  actor: string;
  diff?: Record<string, { previous: unknown; current: unknown }>;
}

export interface CertifiedExportPack {
  manifest: ExportManifest;
  records: MasterRecord[];
  auditTrail: AuditEvent[];
  versions: RecordVersion[];
  packHash: string;
}

export interface ExportManifest {
  exportedBy: string;
  exportedAt: Date;
  recordType: string;
  tenantId: string;
  recordIds: string[];
  auditTrailHash: string;
  versionHash: string;
  recordHash: string;
}

export interface RecordDefinition {
  type: string;
  description: string;
  schema: z.ZodTypeAny;
  classification: "public" | "internal" | "confidential" | "restricted";
  retentionPolicy?: RetentionPolicy;
  fields?: string[];
}

export interface RecordSearchQuery {
  recordType?: string;
  tenantId?: string;
  text?: string;
  tags?: string[];
  classification?: string;
  certificationStatus?: string;
  createdBefore?: Date;
  createdAfter?: Date;
  underHold?: boolean;
}

export interface RoleTemplate {
  name: "records_officer" | "records_admin" | "records_operator";
  permissions: string[];
  description: string;
}
