import { v4 as uuidv4 } from "uuid";
import type { LegalHold } from "@intelgraph/mdm-core";

export class LegalHoldService {
  private holds: Map<string, LegalHold> = new Map();

  applyHold(
    recordType: string,
    tenantId: string,
    appliedBy: string,
    reason: string,
    scope: LegalHold["scope"] = "record",
    recordIds?: string[]
  ): LegalHold {
    const hold: LegalHold = {
      id: uuidv4(),
      recordType,
      tenantId,
      scope,
      recordIds,
      appliedBy,
      reason,
      createdAt: new Date(),
    };

    this.holds.set(hold.id, hold);
    return hold;
  }

  releaseHold(holdId: string): LegalHold {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold ${holdId} not found`);
    }

    hold.releasedAt = new Date();
    this.holds.set(holdId, hold);
    return hold;
  }

  listActive(): LegalHold[] {
    return Array.from(this.holds.values()).filter((hold) => !hold.releasedAt);
  }

  holdsForRecord(recordId: string, recordType: string, tenantId: string): LegalHold[] {
    return this.listActive().filter((hold) => {
      if (hold.scope === "tenant") return hold.tenantId === tenantId;
      if (hold.scope === "type")
        return hold.recordType === recordType && hold.tenantId === tenantId;
      return hold.recordIds?.includes(recordId) ?? false;
    });
  }
}
