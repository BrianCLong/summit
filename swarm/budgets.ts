export type SwarmBudgets = { maxAgents: number; maxSteps: number; maxToolCalls: number; maxWallMs: number; };
export type SwarmUsage = { agentsSpawned: number; stepsExecuted: number; toolCalls: number; wallMs: number; };
export function assertWithinBudgets(b: SwarmBudgets, u: SwarmUsage): void {
  const errs: string[] = [];
  if (u.agentsSpawned > b.maxAgents) errs.push("agents");
  if (u.stepsExecuted > b.maxSteps) errs.push("steps");
  if (u.toolCalls > b.maxToolCalls) errs.push("toolCalls");
  if (u.wallMs > b.maxWallMs) errs.push("wallMs");
  if (errs.length > 0) throw new Error(`budget_exceeded:${errs.join(",")}`);
}
