import { SwarmPlan } from "./planner";
import { assertWithinBudgets, SwarmBudgets, SwarmUsage } from "./budgets";
export type RuntimeResult = { ok: boolean; usage: SwarmUsage; outputs: Record<string, string> };
export async function runPlan(plan: SwarmPlan, budgets: SwarmBudgets, policyCheck?: (toolName: string) => void): Promise<RuntimeResult> {
  const usage: SwarmUsage = { agentsSpawned: 1, stepsExecuted: 0, toolCalls: 0, wallMs: 0 };
  const outputs: Record<string, string> = {};
  const startTime = Date.now();
  try {
    for (const t of plan.tasks) {
      usage.stepsExecuted += 1;
      if (policyCheck) { usage.toolCalls += 1; policyCheck("simulatedTool"); }
      usage.wallMs = Date.now() - startTime;
      assertWithinBudgets(budgets, usage);
      outputs[t.taskId] = `Completed: ${t.description}`;
    }
    return { ok: true, usage, outputs };
  } catch (e) {
    return { ok: false, usage, outputs: { error: (e as Error).message } };
  }
}
