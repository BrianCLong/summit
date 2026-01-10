import { Provider } from './types';
import { EvalReport, EvalResult, EvalSuite, ToolCall } from './types';

function matchesExpectedAnswer(expected: string | undefined, actual: string): boolean {
  if (!expected) return true;
  return expected.trim().toLowerCase() === actual.trim().toLowerCase();
}

function requiredToolsSatisfied(required: string[] | undefined, toolCalls: ToolCall[]): boolean {
  if (!required || required.length === 0) {
    return true;
  }

  const present = new Set(toolCalls.map((call) => call.tool));
  return required.every((tool) => present.has(tool));
}

function computeRubricScore(taskRubric = [], matchedAnswer: boolean): number {
  if (!taskRubric || taskRubric.length === 0) return 0;
  return taskRubric.reduce((total, criterion) => total + (matchedAnswer ? criterion.maxScore : 0), 0);
}

function buildResult(task: EvalSuite['tasks'][number], output: string, toolCalls: ToolCall[], latencyMs: number): EvalResult {
  const matchedAnswer = matchesExpectedAnswer(task.expected?.answer, output);
  const toolsOk = requiredToolsSatisfied(task.expected?.requiredTools, toolCalls);
  const rubricScore = computeRubricScore(task.rubric, matchedAnswer);
  const success = matchedAnswer && toolsOk;

  return {
    taskId: task.id,
    success,
    metrics: {
      latency_ms: latencyMs,
      tool_call_count: toolCalls.length,
      rubric_score: rubricScore,
    },
    artifacts: {
      output,
      toolCalls,
      toolsSatisfied: toolsOk,
    },
    traces: toolCalls,
  };
}

export async function runEvalSuite(suite: EvalSuite, provider: Provider): Promise<EvalReport> {
  const results: EvalResult[] = [];

  for (const task of suite.tasks) {
    const response = await provider.runTask(task);
    results.push(buildResult(task, response.output, response.toolCalls, response.latencyMs));
  }

  const successCount = results.filter((result) => result.success).length;
  const success_rate = suite.tasks.length ? successCount / suite.tasks.length : 0;
  const mean_latency_ms = results.length
    ? results.reduce((total, result) => total + (result.metrics.latency_ms || 0), 0) / results.length
    : 0;
  const total_tool_calls = results.reduce((total, result) => total + (result.metrics.tool_call_count || 0), 0);
  const average_rubric_score = results.length
    ? results.reduce((total, result) => total + (result.metrics.rubric_score || 0), 0) / results.length
    : 0;

  return {
    suiteId: suite.id,
    generatedAt: new Date().toISOString(),
    summary: {
      success_rate,
      mean_latency_ms,
      total_tool_calls,
      average_rubric_score,
    },
    results,
  };
}
