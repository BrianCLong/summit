import { addDays } from "date-fns";
import type { MasterRecord, RetentionPolicy } from "@intelgraph/mdm-core";
import { LegalHoldService } from "./legal-hold-service.js";

export class RetentionEngine {
  private policies: Map<string, RetentionPolicy> = new Map();

  constructor(private legalHoldService: LegalHoldService) {}

  registerPolicy(recordType: string, tenantId: string, policy: RetentionPolicy): void {
    const key = this.buildKey(recordType, tenantId);
    this.policies.set(key, policy);
  }

  getPolicy(recordType: string, tenantId: string): RetentionPolicy | undefined {
    return this.policies.get(this.buildKey(recordType, tenantId));
  }

  evaluate(record: MasterRecord): {
    expired: boolean;
    expiresAt?: Date;
    holds: string[];
  } {
    const recordType = record.metadata.recordType;
    const tenantId = record.metadata.tenantId;
    if (!recordType || !tenantId) {
      return { expired: false, holds: [] };
    }

    const policy = this.getPolicy(recordType, tenantId);
    if (!policy) {
      return { expired: false, holds: [] };
    }

    const expiresAt = addDays(
      record.createdAt,
      policy.retentionDays + (policy.purgeGraceDays ?? 0)
    );
    const holds = this.legalHoldService
      .holdsForRecord(record.id.id, recordType, tenantId)
      .map((hold) => hold.id);

    const expired = new Date() >= expiresAt && holds.length === 0;

    return { expired, expiresAt, holds };
  }

  attachMetadata(record: MasterRecord): MasterRecord {
    const evaluation = this.evaluate(record);
    record.metadata.retentionExpiresAt = evaluation.expiresAt;
    record.metadata.legalHolds = evaluation.holds;
    return record;
  }

  private buildKey(recordType: string, tenantId: string): string {
    return `${tenantId}:${recordType}`;
  }
}
