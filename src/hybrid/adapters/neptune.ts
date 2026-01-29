import type { HybridRetrievalAdapter, HybridQueryInput } from "../contract";

export const neptuneAdapter: HybridRetrievalAdapter = {
  async execute(_input: HybridQueryInput) {
    throw new Error("Neptune hybrid adapter stub: implementation deferred.");
  },
};
