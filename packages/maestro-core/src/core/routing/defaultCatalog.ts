import type { ModelConfig } from "./types";
import { ModelCatalog } from "./ModelCatalog";

/**
 * Replace IDs with whatever your provider adapters support.
 * The important part is: capability & costWeight are relative and stable for routing.
 */
const MODELS: ModelConfig[] = [
  { id: "fast-mini",  maxTokens: 2000, costWeight: 1, capability: 0.55, domains: ["general", "osint"] },
  { id: "balanced",   maxTokens: 4000, costWeight: 2, capability: 0.70, domains: ["code", "security"] },
  { id: "strong",     maxTokens: 8000, costWeight: 4, capability: 0.88, domains: ["legal", "math", "code"] },
];

export function defaultCatalog(): ModelCatalog {
  return new ModelCatalog(MODELS);
}
