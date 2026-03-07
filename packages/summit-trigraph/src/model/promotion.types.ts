export type PromotionDecision = "ALLOW" | "QUARANTINE" | "DENY";

export interface PromotionAuditEntry {
  promotion_id: string;
  claim_id: string;
  from_graph: "BG" | "NG";
  to_graph: "RG";
  decision: PromotionDecision;
  reasons: string[];
}
