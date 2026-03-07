export type BoxPolicy = {
  maxSteps: number
  maxTokens: number
  network: "off" | "allowlist"
  writablePaths: string[]
  allowToolIds: string[]
  mutableConfig: false
}

export type Task = {
  id: string
  prompt: string
  context: Record<string, any>
}

export type RunResult = {
  trace: any[]
  output: string
  tokensUsed: number
  steps: number
}

function enforceImmutablePolicy(policy: BoxPolicy): void {
  if (policy.mutableConfig !== false) {
    throw new Error("Policy violation: mutableConfig must be false");
  }
  Object.freeze(policy);
}

async function executeWithGuards(task: Task, policy: BoxPolicy): Promise<RunResult> {
  // Simulate execution respecting the bounds
  return {
    trace: [],
    output: "Boxed execution completed.",
    tokensUsed: 0,
    steps: 0
  };
}

export async function runBoxedAgent(task: Task, policy: BoxPolicy): Promise<RunResult> {
  enforceImmutablePolicy(policy)
  return executeWithGuards(task, policy)
}
