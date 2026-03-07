mkdir -p packages/summit-coggeo/src/ingest
mkdir -p packages/summit-coggeo/src/extract
mkdir -p packages/summit-coggeo/src/features
mkdir -p packages/summit-coggeo/src/models
mkdir -p packages/summit-coggeo/src/graph
mkdir -p packages/summit-coggeo/src/api/tiles
mkdir -p packages/summit-coggeo/src/api/explain
mkdir -p packages/summit-coggeo/src/storage/duckdb
mkdir -p packages/summit-coggeo/src/bin

cat << 'INNER_EOF' > packages/summit-coggeo/src/ingest/normalizeObservation.ts
import crypto from "node:crypto";

export interface RawObservationInput {
  ts: string;
  source: string;
  content: string;
  url?: string | null;
  author?: string | null;
  lang?: string | null;
  geo?: { h3?: string; country?: string | null; region?: string | null } | null;
}

export interface Observation {
  id: string;
  ts: string;
  source: string;
  author: string | null;
  url: string | null;
  lang: string | null;
  content: string;
  geo: { h3?: string; country?: string | null; region?: string | null } | null;
  provenance: {
    collector: string;
    hash: string;
    confidence: number;
    model?: string | null;
    prompt_id?: string | null;
  };
}

export function normalizeObservation(
  input: RawObservationInput,
  collector = "summit-coggeo",
): Observation {
  const hash = crypto.createHash("sha256").update(input.source + "|" + (input.url ?? "") + "|" + input.content).digest("hex");
  const id = \`obs:\${hash.slice(0, 24)}\`;

  return {
    id,
    ts: input.ts,
    source: input.source,
    author: input.author ?? null,
    url: input.url ?? null,
    lang: input.lang ?? null,
    content: input.content,
    geo: input.geo ?? null,
    provenance: { collector, hash, confidence: 1 },
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/extract/extractSignals.ts
export interface NarrativeCandidate {
  id: string;
  obs_id: string;
  ts: string;
  title: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export interface FrameSignal {
  id: string;
  obs_id: string;
  ts: string;
  frame: string;
  polarity: number;
  confidence: number;
}

export interface EmotionSignal {
  id: string;
  obs_id: string;
  ts: string;
  valence: number;
  arousal: number;
  anger?: number;
  fear?: number;
  sadness?: number;
  joy?: number;
  confidence: number;
}

export interface BeliefSignal {
  id: string;
  obs_id: string;
  ts: string;
  statement: string;
  certainty: number;
  confidence: number;
  targets: string[];
}

export interface ExtractSignalsResult {
  narratives: NarrativeCandidate[];
  frames: FrameSignal[];
  emotions: EmotionSignal[];
  beliefs: BeliefSignal[];
  provenance: { model: string; prompt_id: string };
}

export async function extractSignals(obs: { id: string; ts: string; content: string }): Promise<ExtractSignalsResult> {
  const lower = obs.content.toLowerCase();

  let title = "Institutional trust shock";
  let summary = "A narrative centered on distrust, scandal, and public anger.";
  let tags = ["trust", "scandal", "anger"];

  if (lower.includes("corruption")) {
    title = "Corruption and waste backlash";
    summary = "A narrative focused on corruption, waste, and institutional failure.";
    tags = ["corruption", "waste", "institutional-failure"];
  }

  return {
    narratives: [
      {
        id: \`narCand:demo-corruption-backlash\`,
        obs_id: obs.id,
        ts: obs.ts,
        title,
        summary,
        tags,
        confidence: 0.72,
      },
    ],
    frames: [
      {
        id: \`frame:\${obs.id}\`,
        obs_id: obs.id,
        ts: obs.ts,
        frame: "elite corruption",
        polarity: -0.7,
        confidence: 0.67,
      },
    ],
    emotions: [
      {
        id: \`emo:\${obs.id}\`,
        obs_id: obs.id,
        ts: obs.ts,
        valence: -0.8,
        arousal: 0.9,
        anger: 0.82,
        fear: 0.33,
        sadness: 0.12,
        joy: 0.01,
        confidence: 0.74,
      },
    ],
    beliefs: [
      {
        id: \`belief:\${obs.id}\`,
        obs_id: obs.id,
        ts: obs.ts,
        statement: "Institutions are wasting resources and cannot be trusted.",
        certainty: 0.76,
        confidence: 0.68,
        targets: ["institutions"],
      },
    ],
    provenance: { model: "stub-demo-v2", prompt_id: "stub-demo-v2" },
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/features/clusterNarratives.ts
export interface Narrative {
  id: string;
  title: string;
  summary: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
  confidence: number;
}

export interface NarrativeCandidate {
  id: string;
  obs_id: string;
  ts: string;
  title: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export function clusterNarratives(cands: NarrativeCandidate[]): { narratives: Narrative[]; membership: Array<{ obs_id: string; narrative_id: string }> } {
  const narratives: Narrative[] = cands.map((c) => ({
    id: \`nar:\${c.id.replace("narCand:", "")}\`,
    title: c.title,
    summary: c.summary,
    first_seen: c.ts,
    last_seen: c.ts,
    tags: c.tags ?? [],
    confidence: Math.max(0.01, c.confidence),
  }));

  const membership = cands.map((c, i) => ({ obs_id: c.obs_id, narrative_id: narratives[i]!.id }));
  return { narratives, membership };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/features/computeTerrain.ts
export interface TerrainCell {
  id: string;
  ts_bucket: string;
  h3: string;
  narrative_id: string;
  pressure: number;
  temperature: number;
  wind_u: number;
  wind_v: number;
  turbulence: number;
  storm_score: number;
}

export function computeTerrainCells(args: {
  tsBucket: string;
  narrativeId: string;
  h3: string;
  volume: number;
  emotionArousal: number;
  contradiction: number;
  windU?: number;
  windV?: number;
}): TerrainCell {
  const pressure = args.volume;
  const temperature = args.emotionArousal;
  const turbulence = args.contradiction;
  const storm_score = Math.min(1, (pressure * 0.02) + (temperature * 0.6));

  return {
    id: \`cell:\${args.tsBucket}:\${args.h3}:\${args.narrativeId}\`,
    ts_bucket: args.tsBucket,
    h3: args.h3,
    narrative_id: args.narrativeId,
    pressure,
    temperature,
    wind_u: args.windU ?? 0,
    wind_v: args.windV ?? 0,
    turbulence,
    storm_score,
  };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/models/stormDetector.ts
import type { TerrainCell } from "../features/computeTerrain.js";

export interface StormEvent {
  id: string;
  narrative_id: string;
  start_ts: string;
  end_ts: string | null;
  severity: number;
  cells: string[];
  explain_ref: string;
}

export function detectStorms(cells: TerrainCell[], ts: string, threshold = 0.85): StormEvent[] {
  const hot = cells.filter((c) => c.storm_score >= threshold);
  if (hot.length === 0) return [];

  const narrative_id = hot[0]!.narrative_id;
  const id = \`storm:\${ts}:\${narrative_id}\`;

  return [
    {
      id,
      narrative_id,
      start_ts: ts,
      end_ts: null,
      severity: Math.min(1, hot.reduce((m, c) => Math.max(m, c.storm_score), 0)),
      cells: hot.map((c) => c.id),
      explain_ref: \`explain:\${id}\`,
    },
  ];
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/models/gravityWells.ts
export interface GravityWell {
  id: string;
  label: string;
  strength: number;
  time_window: string;
  evidence_refs: string[];
  explain_ref: string;
}

export function detectGravityWells(_args: { window: string }): GravityWell[] {
  return [];
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/models/faultLines.ts
export interface FaultLine {
  id: string;
  label: string;
  stress: number;
  trigger_sensitivity: number;
  scope: string;
  evidence_refs: string[];
  explain_ref: string;
}

export function detectFaultLines(_args: { scope: string; window: string }): FaultLine[] {
  return [];
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/models/plates.ts
export interface WorldviewPlate {
  id: string;
  label: string;
  velocity: number;
  scope: string;
  evidence_refs: string[];
  explain_ref: string;
}

export function detectPlates(_args: { scope: string; window: string }): WorldviewPlate[] {
  return [];
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/models/currents.ts
export interface OceanCurrent {
  id: string;
  label: string;
  strength: number;
  direction: string;
  time_window: string;
  explain_ref: string;
}

export function detectCurrents(_args: { window: string }): OceanCurrent[] {
  return [];
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/graph/buildCogGeoWriteSet.ts
import crypto from "node:crypto";
import type { ExplainPayload } from "../api/types.js";
import type { StormEvent } from "../models/stormDetector.js";
import type { TerrainCell } from "../features/computeTerrain.js";
import type { Narrative } from "../features/clusterNarratives.js";
import type { Observation } from "../ingest/normalizeObservation.js";

export interface CogGeoWriteSet {
  id: string;
  ts: string;
  nodes: Array<{ type: string; id: string; data: Record<string, unknown> }>;
  edges: Array<{ type: string; from: string; to: string; data: Record<string, unknown> }>;
  provenance: { collector: string; hash: string; models: string[] };
}

export function buildCogGeoWriteSet(args: {
  ts: string;
  collector?: string;
  models?: string[];
  observations?: Observation[];
  narratives?: Narrative[];
  terrain?: TerrainCell[];
  storms?: StormEvent[];
  explains?: ExplainPayload[];
}): CogGeoWriteSet {
  const collector = args.collector ?? "summit-coggeo";
  const models = args.models ?? ["stub"];

  const seed = JSON.stringify({
    ts: args.ts,
    counts: {
      obs: args.observations?.length ?? 0,
      nar: args.narratives?.length ?? 0,
      cell: args.terrain?.length ?? 0,
      storm: args.storms?.length ?? 0,
      explain: args.explains?.length ?? 0,
    },
  });

  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const id = \`coggeoWS:\${hash.slice(0, 24)}\`;

  const nodes: CogGeoWriteSet["nodes"] = [];
  const edges: CogGeoWriteSet["edges"] = [];

  for (const o of args.observations ?? []) nodes.push({ type: "Observation", id: o.id, data: o as any });
  for (const n of args.narratives ?? []) nodes.push({ type: "Narrative", id: n.id, data: n as any });
  for (const c of args.terrain ?? []) nodes.push({ type: "TerrainCell", id: c.id, data: c as any });
  for (const s of args.storms ?? []) nodes.push({ type: "StormEvent", id: s.id, data: s as any });
  for (const e of args.explains ?? []) nodes.push({ type: "ExplainPayload", id: e.id, data: e as any });

  for (const s of args.storms ?? []) {
    edges.push({ type: "STORM_HAS_EXPLAIN", from: s.id, to: s.explain_ref, data: {} });
    edges.push({ type: "STORM_FOR_NARRATIVE", from: s.id, to: s.narrative_id, data: {} });
    for (const cellId of s.cells) edges.push({ type: "STORM_AFFECTS_CELL", from: s.id, to: cellId, data: {} });
  }

  return { id, ts: args.ts, nodes, edges, provenance: { collector, hash, models } };
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/api/types.ts
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
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/graph/intelGraphAdapterStub.ts
import fs from "node:fs";
import path from "node:path";

export interface IntelGraphWriteResult {
  accepted: boolean;
  written_nodes: number;
  written_edges: number;
  outPath: string;
}

export class IntelGraphAdapterStub {
  constructor(private opts: { outDir: string }) {}

  async writeArtifacts(envelope: any): Promise<IntelGraphWriteResult> {
    const outDir = this.opts.outDir;
    fs.mkdirSync(outDir, { recursive: true });

    const file = path.join(outDir, \`intelgraph-write-\${Date.now()}.jsonl\`);
    const lines: string[] = [];
    lines.push(JSON.stringify({ kind: "writeset-envelope", ts: new Date().toISOString(), id: envelope?.id ?? null }));

    const nodes = envelope?.nodes ?? [];
    const edges = envelope?.edges ?? [];

    for (const n of nodes) lines.push(JSON.stringify({ kind: "node", ...n }));
    for (const e of edges) lines.push(JSON.stringify({ kind: "edge", ...e }));

    if (envelope?.coggeo) {
      lines.push(JSON.stringify({ kind: "coggeo", ...envelope.coggeo }));
    }

    fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");

    return { accepted: true, written_nodes: nodes.length, written_edges: edges.length, outPath: file };
  }
}
INNER_EOF
