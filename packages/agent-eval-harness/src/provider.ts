import { EvalTask, Provider, ProviderResponse, ToolCall } from './types';

const baseLatency = 45;

function deriveLatency(toolCalls: ToolCall[], taskName: string): number {
  const toolCost = toolCalls.length * 15;
  const nameCost = Math.min(taskName.length, 120);
  return baseLatency + toolCost + nameCost;
}

function deriveOutput(task: EvalTask): string {
  if (task.expected?.answer) {
    return task.expected.answer;
  }

  const query = typeof task.input.query === 'string' ? (task.input.query as string) : task.name;
  return `Completed task: ${query}`;
}

export class MockToolProvider implements Provider {
  async runTask(task: EvalTask): Promise<ProviderResponse> {
    const toolPlan = Array.isArray(task.input.toolPlan)
      ? (task.input.toolPlan as ToolCall[])
      : [];
    const toolCalls = toolPlan.map((call) => ({
      tool: call.tool,
      input: call.input,
      output: call.output,
    }));

    const output = deriveOutput(task);
    const latencyMs = deriveLatency(toolCalls, task.name);

    return {
      output,
      toolCalls,
      latencyMs,
      traces: toolCalls.map((call) => ({
        tool: call.tool,
        input: call.input,
        output: call.output,
      })),
    };
  }
}
