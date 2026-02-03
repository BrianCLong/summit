export type HybridQueryInput = {
  tenant: string;
  query: string;
  maxHops: number;
};

export type HybridCandidate = {
  id: string;
  score: number;
  source: "vector" | "graph" | "hybrid";
};

export type HybridTrace = {
  policy: { decision: "allow" | "deny"; ruleId?: string };
  stats: { candidateCount: number; graphHops: number };
};

export interface HybridRetrievalAdapter {
  execute(
    input: HybridQueryInput,
  ): Promise<{ candidates: HybridCandidate[]; trace: HybridTrace }>;
}

export const HYBRID_ADAPTERS_FLAG = "SUMMIT_HYBRID_RETRIEVAL_ADAPTERS";

export function areHybridAdaptersEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = env[HYBRID_ADAPTERS_FLAG];
  return value === "1" || value === "true";
}

export async function executeWithAdapter(
  adapter: HybridRetrievalAdapter,
  input: HybridQueryInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ candidates: HybridCandidate[]; trace: HybridTrace }> {
  if (!areHybridAdaptersEnabled(env)) {
    throw new Error("Hybrid retrieval adapters are disabled.");
  }
  return adapter.execute(input);
}
