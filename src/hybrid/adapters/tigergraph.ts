import type { HybridRetrievalAdapter, HybridQueryInput } from "../contract";

export const tigergraphAdapter: HybridRetrievalAdapter = {
  async execute(_input: HybridQueryInput) {
    throw new Error("TigerGraph hybrid adapter stub: implementation deferred.");
  },
};
