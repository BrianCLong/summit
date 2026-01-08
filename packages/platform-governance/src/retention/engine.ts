import { z } from "zod";
import crypto from "crypto";
import { RecordEntry, RecordFramework } from "../records/framework.js";

export const RetentionTierSchema = z.enum(["regulatory", "operational", "analytics", "backup"]);
export type RetentionTier = z.infer<typeof RetentionTierSchema>;

export const RetentionPolicySchema = z.object({
  id: z.string(),
  recordType: z.string(),
  tier: RetentionTierSchema,
  durationDays: z.number().positive(),
  deletionMode: z.enum(["soft", "hard"]).default("soft"),
  propagateToDerived: z.boolean().default(true),
});

export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const LegalHoldSchema = z.object({
  id: z.string(),
  reason: z.string(),
  scope: z.object({
    recordIds: z.array(z.string()).default([]),
    recordTypes: z.array(z.string()).default([]),
  }),
  createdBy: z.string(),
  createdAt: z.date(),
});

export type LegalHold = z.infer<typeof LegalHoldSchema>;

export interface DeletionPreview {
  affectedRecords: string[];
  blockedByHold: string[];
  evidenceToken: string;
}

export interface DeletionResult {
  deleted: string[];
  skipped: string[];
  attestation: string;
}

export interface DsarResponse {
  subjectId: string;
  records: Array<{ id: string; type: string; metadata: Record<string, unknown> }>;
  propagation: string[];
}

export interface RetentionReport {
  policyCount: number;
  holds: number;
  defaults: number;
  blockedRecords: string[];
  expiringRecords: string[];
}

function now(): Date {
  return new Date();
}

export class RetentionEngine {
  private policies: Map<string, RetentionPolicy> = new Map();
  private holds: Map<string, LegalHold> = new Map();
  private retentionClassDefaults: Map<string, RetentionPolicy> = new Map();

  constructor(private framework: RecordFramework) {}

  private collectDerived(record: RecordEntry, accumulator: Set<string>): void {
    for (const childId of record.lineage.children) {
      if (accumulator.has(childId)) continue;
      accumulator.add(childId);
      const child = this.framework.getRecord(childId);
      if (child) {
        this.collectDerived(child, accumulator);
      }
    }
  }

  registerPolicy(policy: RetentionPolicy): void {
    const validated = RetentionPolicySchema.parse(policy);
    this.policies.set(validated.id, validated);
  }

  registerDefault(retentionClass: string, policy: RetentionPolicy): void {
    const validated = RetentionPolicySchema.parse(policy);
    this.retentionClassDefaults.set(retentionClass, validated);
  }

  placeLegalHold(hold: Omit<LegalHold, "createdAt">): LegalHold {
    const validated = LegalHoldSchema.parse({ ...hold, createdAt: now() });
    this.holds.set(validated.id, validated);
    return validated;
  }

  removeLegalHold(holdId: string): boolean {
    return this.holds.delete(holdId);
  }

  private isOnHold(record: RecordEntry): boolean {
    for (const hold of this.holds.values()) {
      if (hold.scope.recordIds.includes(record.id)) return true;
      if (hold.scope.recordTypes.includes(record.type)) return true;
    }
    return false;
  }

  private policyFor(record: RecordEntry): RetentionPolicy | undefined {
    const direct = [...this.policies.values()].find((p) => p.recordType === record.type);
    if (direct) return direct;
    return this.retentionClassDefaults.get(record.metadata.retentionClass);
  }

  previewDeletion(asOf: Date = now()): DeletionPreview {
    const affected: string[] = [];
    const blockedByHold: string[] = [];

    for (const record of this.framework.search({})) {
      const policy = this.policyFor(record);
      if (!policy) continue;
      const createdAt = record.versions[0]?.timestamp;
      if (!createdAt) continue;
      const expiresAt = new Date(createdAt.getTime() + policy.durationDays * 24 * 60 * 60 * 1000);
      if (expiresAt > asOf) continue;

      if (this.isOnHold(record)) {
        blockedByHold.push(record.id);
      } else {
        affected.push(record.id);
      }
    }

    return {
      affectedRecords: affected,
      blockedByHold,
      evidenceToken: crypto.randomUUID(),
    };
  }

  executeDeletion(actor: string, preview?: DeletionPreview): DeletionResult {
    const plan = preview ?? this.previewDeletion();
    const deleted: string[] = [];
    const skipped: string[] = [...plan.blockedByHold];

    for (const id of plan.affectedRecords) {
      const record = this.framework.getRecord(id);
      if (!record) continue;
      const policy = this.policyFor(record);
      if (!policy) continue;
      if (this.isOnHold(record)) {
        skipped.push(id);
        continue;
      }
      const attestation = crypto
        .createHash("sha256")
        .update(`${id}:${actor}:${now().toISOString()}`)
        .digest("hex");
      this.framework.deleteRecord(id, actor, attestation);
      deleted.push(id);
      if (policy.propagateToDerived) {
        for (const childId of record.lineage.children) {
          const child = this.framework.getRecord(childId);
          if (child && !this.isOnHold(child)) {
            this.framework.deleteRecord(childId, actor, attestation);
            deleted.push(childId);
          }
        }
      }
    }

    return { deleted, skipped, attestation: crypto.randomUUID() };
  }

  dsar(subjectId: string, includeDerived = true): DsarResponse {
    const matches = this.framework.search({ tags: [subjectId] });
    const propagation: string[] = [];
    const seen = new Set<string>();
    const records: DsarResponse["records"] = [];

    for (const record of matches) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      records.push({
        id: record.id,
        type: record.type,
        metadata: record.metadata as Record<string, unknown>,
      });
      if (!includeDerived) continue;
      const derived = new Set<string>();
      this.collectDerived(record, derived);
      for (const childId of derived) {
        if (seen.has(childId)) continue;
        const child = this.framework.getRecord(childId);
        if (child) {
          seen.add(childId);
          propagation.push(childId);
          records.push({
            id: child.id,
            type: child.type,
            metadata: child.metadata as Record<string, unknown>,
          });
        }
      }

      for (const parentId of record.lineage.parents) {
        if (seen.has(parentId)) continue;
        const parent = this.framework.getRecord(parentId);
        if (parent) {
          seen.add(parentId);
          propagation.push(parentId);
          records.push({
            id: parent.id,
            type: parent.type,
            metadata: parent.metadata as Record<string, unknown>,
          });
        }
      }
    }

    return { subjectId, records, propagation };
  }

  report(asOf: Date = now()): RetentionReport {
    const preview = this.previewDeletion(asOf);
    return {
      policyCount: this.policies.size,
      holds: this.holds.size,
      defaults: this.retentionClassDefaults.size,
      blockedRecords: preview.blockedByHold,
      expiringRecords: preview.affectedRecords,
    };
  }
}

export function createRetentionEngine(framework: RecordFramework): RetentionEngine {
  return new RetentionEngine(framework);
}
