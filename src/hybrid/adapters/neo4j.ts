import type { HybridRetrievalAdapter, HybridQueryInput } from "../contract";

export const neo4jAdapter: HybridRetrievalAdapter = {
  async execute(_input: HybridQueryInput) {
    throw new Error("Neo4j hybrid adapter stub: implementation deferred.");
  },
};
