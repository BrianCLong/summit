export type Narrative = { id: string; label: string; evidence_refs: string[] };

export type TerrainCell = {
  id: string;
  ts_bucket: string;
  h3: string;
  narrative_id: string;
  pressure: number;
  temperature: number;
};

export type ExplainPayload = {
  id: string;
  summary: string;
  drivers: Array<{ name: string; delta: number; evidence: string[] }>;
  confidence: number;
  provenance: { models: string[] };
};
