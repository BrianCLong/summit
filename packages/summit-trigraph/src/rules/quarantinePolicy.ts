import type { PromotionAuditEntry } from "../model/promotion.types";

export function isQuarantined(entry: PromotionAuditEntry): boolean {
  return entry.decision === "QUARANTINE";
}
