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
