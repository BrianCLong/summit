import { useMemo } from "react";
import type { ExplainPayload, Narrative, TerrainCell } from "../types";

type CogGeoApi = {
  getNarratives: () => Promise<Narrative[]>;
  getTerrain: () => Promise<TerrainCell[]>;
  explain: (id: string) => Promise<ExplainPayload>;
};

export function useCogGeoApi(): CogGeoApi {
  return useMemo(
    () => ({
      getNarratives: async () => [],
      getTerrain: async () => [],
      explain: async (id: string) => ({
        id,
        summary: "No explanation available yet.",
        drivers: [],
        confidence: 0,
        provenance: { models: [] },
      }),
    }),
    []
  );
}
