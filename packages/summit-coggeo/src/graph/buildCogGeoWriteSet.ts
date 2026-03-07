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
  const id = `coggeoWS:${hash.slice(0, 24)}`;

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
