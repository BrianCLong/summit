import type { ExplainPayload, Narrative, TerrainCell } from "./types";
import { buildExplainPayload } from "../ui-contract/explain";

export type CogGeoQueryService = {
  listNarratives: () => Promise<Narrative[]>;
  listTerrainCells: () => Promise<TerrainCell[]>;
  explain: (id: string) => Promise<ExplainPayload>;
};

export function createCogGeoQueryService(): CogGeoQueryService {
  return {
    listNarratives: async () => [],
    listTerrainCells: async () => [],
    explain: async (id: string) => buildExplainPayload(id),
  };
}
