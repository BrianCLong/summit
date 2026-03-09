export type ISODateTime = string;

export type TerrainLayerKind =
  | "pressure"
  | "temperature"
  | "storm"
  | "wind"
  | "turbulence";

export type ExplainKind = "storm" | "well" | "fault" | "plate" | "current" | "terrain";

export interface ExplainPayload {
  id: string;
  kind: ExplainKind;
  summary: string;
  drivers: Array<{ name: string; delta: number; evidence: string[] }>;
  top_narratives?: Array<{ narrative_id: string; role: string; evidence: string[] }>;
  confidence: number;
  provenance: { models: string[]; prompt_ids?: string[] };
}

export interface CogGeoStormSummary {
  id: string;
  narrative_id: string;
  start_ts: ISODateTime;
  end_ts?: ISODateTime | null;
  severity: number;
  explain_ref: string;
}

export interface TerrainTileQuery {
  narrativeId: string;
  tsBucket: string;
  layer: TerrainLayerKind;
}

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

export type CogGeoWrite = {
  kind?: string;
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
