import type { ExplainPayload, CogGeoStormSummary } from "./types";

/**
 * Skeleton router interface to match whatever server framework you use.
 * Adapt to Express/Fastify/Hono/Next route handlers.
 */
export interface CogGeoApi {
  listNarratives(): Promise<Array<{ id: string; title: string }>>;
  listStorms(args: { timeRange: string; narrativeId?: string }): Promise<CogGeoStormSummary[]>;
  getExplain(explainId: string): Promise<ExplainPayload>;
}

export function createInMemoryCogGeoApi(): CogGeoApi {
  return {
    async listNarratives() {
      return [{ id: "nar:stub", title: "Stub narrative" }];
    },
    async listStorms() {
      return [];
    },
    async getExplain(explainId: string) {
      return {
        id: explainId,
        kind: "storm",
        summary: "Explain payload stub. Wire to graph query + evidence traversal.",
        drivers: [],
        confidence: 0.01,
        provenance: { models: ["stub"], prompt_ids: ["stub"] },
      };
    },
  };
}
