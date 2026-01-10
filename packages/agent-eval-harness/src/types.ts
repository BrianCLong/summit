export interface EvalTask {
  id: string;
  name: string;
  input: Record<string, unknown>;
  expected?: {
    answer?: string;
    requiredTools?: string[];
  };
  rubric?: RubricCriterion[];
  toolsAllowed?: string[];
  tags?: string[];
}

export interface RubricCriterion {
  id: string;
  description: string;
  maxScore: number;
}

export interface EvalResult {
  taskId: string;
  success: boolean;
  metrics: Record<string, number>;
  artifacts: Record<string, unknown>;
  traces?: unknown[];
}

export interface EvalSuite {
  id: string;
  description: string;
  tasks: EvalTask[];
}

export interface SuiteSummary {
  success_rate: number;
  mean_latency_ms: number;
  total_tool_calls: number;
  average_rubric_score: number;
}

export interface EvalReport {
  suiteId: string;
  generatedAt: string;
  summary: SuiteSummary;
  results: EvalResult[];
}

export interface ToolCall {
  tool: string;
  input: unknown;
  output: unknown;
}

export interface ProviderResponse {
  output: string;
  toolCalls: ToolCall[];
  latencyMs: number;
  traces?: unknown[];
}

export interface Provider {
  runTask(task: EvalTask): Promise<ProviderResponse>;
}
