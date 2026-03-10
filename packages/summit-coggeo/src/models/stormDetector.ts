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
  const id = `storm:${ts}:${narrative_id}`;

  return [
    {
      id,
      narrative_id,
      start_ts: ts,
      end_ts: null,
      severity: Math.min(1, hot.reduce((m, c) => Math.max(m, c.storm_score), 0)),
      cells: hot.map((c) => c.id),
      explain_ref: `explain:${id}`,
    },
  ];
}
