export interface GraphEvidenceLink {
  entityId: string;
  relation: "supports" | "contradicts" | "describes" | "originates_from";
  confidence: number;
}
