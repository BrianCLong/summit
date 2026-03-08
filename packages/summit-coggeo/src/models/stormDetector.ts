import type { TerrainCell } from "../api/types";

export type StormEvent = {
  id: string;
  narrative_id: string;
  severity: number;
  evidence_refs: string[];
};

export function detectStorms(cells: TerrainCell[]): StormEvent[] {
  return cells
    .filter((cell) => (cell.storm_score ?? 0) > 0.75)
    .map((cell) => ({
      id: `storm:${cell.id}`,
      narrative_id: cell.narrative_id,
      severity: cell.storm_score ?? 0,
      evidence_refs: [cell.id],
    }));
}
