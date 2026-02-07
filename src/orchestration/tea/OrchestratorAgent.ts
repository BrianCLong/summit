import { Environment, PlanStep, TeaLlmClient, ToolCall } from './types';
import { ToolManager } from './ToolManager';

export class OrchestratorAgent {
  constructor(
    private readonly llm: TeaLlmClient,
    private readonly toolManager: ToolManager,
  ) {}

  async handleTask(task: string, env: Environment): Promise<unknown[]> {
    const plan = await this.llm.plan(task, env, this.toolManager.list());
    const results: unknown[] = [];

    for (const step of plan) {
      const stepResults = await this.executeStep(step, env);
      results.push({ step: step.summary, results: stepResults });
    }

    return results;
  }

  private async executeStep(
    step: PlanStep,
    env: Environment,
  ): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const call of step.calls) {
      const result = await this.invokeTool(call, env);
      results.push(result);
    }

    return results;
  }

  private async invokeTool(call: ToolCall, env: Environment): Promise<unknown> {
    const tool = this.toolManager.get(call.toolId);
    if (!tool) {
      throw new Error(`Tool ${call.toolId} is not registered`);
    }

    return tool.invoke(call.input, env);
  }
}
