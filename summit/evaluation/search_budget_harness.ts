export type SearchBudget = {
  maxNodes: number;
  maxDepth: number;
  maxRollouts: number;
}

export type EvalTask = {
  id: string;
  problem: string;
}

export type HarnessResult = {
  trace: any[];
  score: number;
}

export async function evaluateSearchPolicy(task: EvalTask, budget: SearchBudget): Promise<HarnessResult> {
  const trace: any[] = []
  // offline only; no external side effects

  if (budget.maxNodes < 0 || budget.maxDepth < 0 || budget.maxRollouts < 0) {
    throw new Error("Invalid budget bounds");
  }

  // simulate bounded search
  trace.push({ event: "search_start", task: task.id })

  return { trace, score: 0 }
}
