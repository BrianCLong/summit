<<<<<<< HEAD
import type { IntelGraphClient } from "./intelGraphClient.js";
import type { ExplainPayload } from "../api/types.js";
=======
import type { IntelGraphClient } from "./intelGraphClient";
import type { ExplainPayload } from "../api/types";
>>>>>>> origin/main

type StormEvent = {
  id: string;
  narrative_id: string;
  start_ts: string;
  end_ts: string | null;
  severity: number;
  cells: string[];
  explain_ref: string;
};

type TerrainCell = {
  id: string;
  ts_bucket: string;
  h3: string;
  narrative_id: string;
  pressure: number;
  temperature: number;
  turbulence: number;
  storm_score: number;
};

type Observation = {
  id: string;
  ts: string;
  source: string;
  url?: string | null;
  content: string;
};

function topK<T>(arr: T[], k: number, score: (t: T) => number): T[] {
  return arr
    .map((t) => ({ t, s: score(t) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.t);
}

<<<<<<< HEAD
=======
/**
 * Evidence walking strategy:
 * StormEvent -> STORM_AFFECTS_CELL -> TerrainCell
 * TerrainCell -> (CELL_SUPPORTED_BY_OBS)* -> Observation
 *
 * NOTE: We haven’t created CELL_SUPPORTED_BY_OBS edges in earlier stubs.
 * If you already have a different evidence edge name, map it here.
 */
>>>>>>> origin/main
export async function buildExplainForStorm(args: {
  stormId: string;
  graph: IntelGraphClient;
}): Promise<ExplainPayload> {
  const stormNode = await args.graph.getNode<StormEvent>(args.stormId);
  if (!stormNode) {
    return {
      id: `explain:${args.stormId}`,
      kind: "storm",
      summary: `Storm not found: ${args.stormId}`,
      drivers: [],
      confidence: 0.01,
      provenance: { models: ["explainTraversal:v1"] },
    };
  }
  const storm = stormNode.data;

<<<<<<< HEAD
=======
  // Load cells
>>>>>>> origin/main
  const cellIds: string[] = storm.cells ?? [];
  const cellNodes = await args.graph.getNodeBatch<TerrainCell>(cellIds);
  const cells = cellNodes.map((n) => n.data);

<<<<<<< HEAD
=======
  // Evidence: gather observations for top cells
  // We assume edges: CELL_SUPPORTED_BY_OBS from cellId -> obsId
>>>>>>> origin/main
  const obsIds = new Set<string>();
  for (const cid of topK(cellIds, 20, (id) => {
    const c = cells.find((x) => x.id === id);
    return c ? c.storm_score : 0;
  })) {
    const edges = await args.graph.getOutgoingEdges(cid, "CELL_SUPPORTED_BY_OBS");
    for (const e of edges) obsIds.add(e.to);
  }
  const obsNodes = obsIds.size ? await args.graph.getNodeBatch<Observation>(Array.from(obsIds).slice(0, 50)) : [];
  const observations = obsNodes.map((n) => n.data);

<<<<<<< HEAD
=======
  // Driver heuristics (replace with your real attribution model later)
>>>>>>> origin/main
  const maxPressure = cells.reduce((m, c) => Math.max(m, c.pressure ?? 0), 0);
  const maxTemp = cells.reduce((m, c) => Math.max(m, c.temperature ?? 0), 0);
  const maxTurb = cells.reduce((m, c) => Math.max(m, c.turbulence ?? 0), 0);

  const drivers: ExplainPayload["drivers"] = [
    {
      name: "Pressure spike",
      delta: maxPressure,
      evidence: topK(cells, 5, (c) => c.pressure).map((c) => c.id),
    },
    {
      name: "Emotional temperature",
      delta: maxTemp,
      evidence: topK(cells, 5, (c) => c.temperature).map((c) => c.id),
    },
    {
      name: "Turbulence / contradiction",
      delta: maxTurb,
      evidence: topK(cells, 5, (c) => c.turbulence).map((c) => c.id),
    },
  ].filter((d) => Number.isFinite(d.delta));

  const evidenceObs = observations.slice(0, 10).map((o) => o.id);

  return {
    id: storm.explain_ref || `explain:${storm.id}`,
    kind: "storm",
    summary: `Storm detected for ${storm.narrative_id} with severity ${storm.severity.toFixed(2)} across ${cells.length} cells.`,
    drivers,
    top_narratives: [
      { narrative_id: storm.narrative_id, role: "storm_narrative", evidence: evidenceObs },
    ],
    confidence: Math.max(0.05, storm.severity),
    provenance: { models: ["explainTraversal:v1"] },
  };
}
