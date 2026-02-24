export type RoutingMode = "LOCAL_SLM" | "FRONTIER_MODEL";

export interface TaskComplexity {
  toolDensity: number; // 0..1
  sequentialDepth: number; // 0..1
  policyConstraints?: string[];
}

export function routeTask(c: TaskComplexity, allowLocal: boolean): RoutingMode {
  if (!allowLocal) return "FRONTIER_MODEL";
  if (c.policyConstraints?.includes("RESIDENCY_LOCAL")) return "LOCAL_SLM";

  if (c.toolDensity < 0.3 && c.sequentialDepth < 0.4) return "LOCAL_SLM";
  return "FRONTIER_MODEL";
}
