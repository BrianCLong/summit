import crypto from "crypto";
export type SwarmRunRequest = { mode: "instant"|"thinking"|"agent"|"swarm"; prompt: string; budgets: { maxAgents:number; maxSteps:number; maxToolCalls:number; maxWallMs:number }; };
export type PlannedTask = { taskId: string; description: string; dependsOn: string[] };
export type SwarmPlan = { runId: string; tasks: PlannedTask[] };
export function deterministicRunId(req: SwarmRunRequest): string {
  const stable = JSON.stringify(req, Object.keys(req).sort());
  return crypto.createHash("sha256").update(stable).digest("hex").slice(0, 16);
}
export function plan(req: SwarmRunRequest): SwarmPlan {
  const runId = deterministicRunId(req);
  return { runId, tasks: [{ taskId: "t0", description: `Execute prompt: ${req.prompt.slice(0, 50)}...`, dependsOn: [] }] };
}
