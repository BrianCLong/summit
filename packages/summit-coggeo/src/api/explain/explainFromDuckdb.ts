import type { CogGeoDuckStore } from "../../storage/duckdb/coggeoDuckStore";
import type { ExplainPayload } from "../types";

export async function explainForCell(args: { explainId: string; store: CogGeoDuckStore }): Promise<ExplainPayload> {
  const cellId = args.explainId.replace(/^explain:/, "");

  const cell = await args.store.getCell(cellId);
  if (!cell) {
    return {
      id: args.explainId,
      kind: "terrain",
      summary: `Cell not found: ${cellId}`,
      drivers: [],
      confidence: 0.01,
      provenance: { models: ["explainFromDuckdb:v1"] },
    };
  }

  const obsIds = await args.store.listObsForCell(cellId);

  return {
    id: args.explainId,
    kind: "terrain",
    summary: `Terrain cell ${cell.h3} for narrative ${cell.narrative_id} at ${cell.ts_bucket}.`,
    drivers: [
      { name: "Pressure", delta: cell.pressure, evidence: [cell.id, ...obsIds.slice(0, 10)] },
      { name: "Temperature", delta: cell.temperature, evidence: [cell.id, ...obsIds.slice(0, 10)] },
      { name: "Storm score", delta: cell.storm_score, evidence: [cell.id, ...obsIds.slice(0, 10)] },
      { name: "Turbulence", delta: cell.turbulence, evidence: [cell.id, ...obsIds.slice(0, 10)] },
    ],
    confidence: Math.min(1, Math.max(0.05, cell.storm_score)),
    provenance: { models: ["explainFromDuckdb:v1"] },
  };
}
