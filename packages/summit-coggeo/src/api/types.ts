export type Observation = {
  id: string;
  ts: string;
  source: string;
  content: string;
  lang?: string | null;
  author?: string | null;
  url?: string | null;
  geo?: { h3?: string; country?: string | null; region?: string | null } | null;
  provenance: { collector: string; hash: string; confidence?: number };
};

export type Narrative = { id: string; label: string; evidence_refs: string[] };

export type TerrainCell = {
  id: string;
  ts_bucket: string;
  h3: string;
  narrative_id: string;
  pressure: number;
  temperature: number;
  wind_u?: number;
  wind_v?: number;
  turbulence?: number;
  storm_score?: number;
};

export type ExplainPayload = {
  id: string;
  summary: string;
  drivers: Array<{ name: string; delta: number; evidence: string[] }>;
  confidence: number;
  provenance: { models: string[] };
};

export type CogGeoWrite = {
  kind: string;
  payload: Record<string, unknown>;
  confidence?: number;
};

export type CogGeoWriteSet = {
  id: string;
  created_at: string;
  producer: string;
  writes: CogGeoWrite[];
  evidence_refs: string[];
};
