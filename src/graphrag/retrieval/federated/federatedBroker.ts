import { FederatedHit } from "../../adapters/types";
import { SourceRegistry } from "../../federation/sourceRegistry";
import { FederationPlanner, PlanOptions } from "../../federation/federationPlanner";

export interface FederatedQuery {
  tenantId: string;
  query: string;
  k: number;
}

export interface FederatedSearchResult {
  results: FederatedHit[];
  sourcesUsed: string[];
  partialFailures: { sourceId: string; error: string }[];
}

export class FederatedBroker {
  constructor(
    private sourceRegistry: SourceRegistry,
    private planner: FederationPlanner
  ) {}

  async search(queryOptions: FederatedQuery): Promise<FederatedSearchResult> {
    const eligibleSourceIds = this.planner.selectEligibleSources({
      tenantId: queryOptions.tenantId,
      query: queryOptions.query,
      k: queryOptions.k,
    });

    const searchPromises = eligibleSourceIds.map(async (sourceId) => {
      const adapter = this.sourceRegistry.getAdapter(sourceId);
      if (!adapter) {
        throw new Error(`Adapter not found for source: ${sourceId}`);
      }
      try {
        const hits = await adapter.search(queryOptions.query, queryOptions.k, queryOptions.tenantId);
        return { sourceId, hits, error: null };
      } catch (error: any) {
        return { sourceId, hits: null, error: error.message || "Unknown error" };
      }
    });

    const results = await Promise.all(searchPromises);

    const allHits: FederatedHit[] = [];
    const sourcesUsed: string[] = [];
    const partialFailures: { sourceId: string; error: string }[] = [];

    for (const result of results) {
      if (result.error) {
        partialFailures.push({ sourceId: result.sourceId, error: result.error });
      } else if (result.hits) {
        sourcesUsed.push(result.sourceId);
        allHits.push(...result.hits);
      }
    }

    // Sort all hits globally by score descending as a simple baseline
    allHits.sort((a, b) => b.score - a.score);

    return {
      results: allHits, // Note: Normalization and Deduping should occur here later
      sourcesUsed,
      partialFailures,
    };
  }
}
