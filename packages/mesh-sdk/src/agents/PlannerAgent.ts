/**
 * Planner Agent
 *
 * Decomposes complex tasks into subtasks and coordinates their execution.
 * Acts as the primary orchestrator for multi-step workflows.
 */

import { BaseAgent, type AgentServices } from '../Agent.js';
import type {
  AgentDescriptor,
  TaskInput,
  TaskOutput,
  UUID,
  SubtaskResult,
} from '../types.js';

interface PlannerInput {
  objective: string;
  constraints?: string[];
  maxSubtasks?: number;
  deadline?: string;
}

interface PlannerOutput {
  plan: TaskPlan;
  subtaskResults: SubtaskResult[];
  summary: string;
}

interface TaskPlan {
  steps: PlanStep[];
  estimatedDuration: number;
  riskAssessment: string;
}

interface PlanStep {
  id: string;
  description: string;
  agentRole: string;
  dependencies: string[];
  priority: number;
}

/**
 * PlannerAgent breaks down complex objectives into actionable subtasks
 * and coordinates their execution across specialized agents.
 */
export class PlannerAgent extends BaseAgent {
  getDescriptor(): Omit<AgentDescriptor, 'id' | 'status' | 'registeredAt' | 'lastHeartbeat'> {
    return {
      name: 'planner-agent',
      version: '1.0.0',
      role: 'planner',
      riskTier: 'medium',
      capabilities: ['task_decomposition', 'workflow_coordination', 'resource_allocation'],
      requiredTools: [],
      modelPreference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.3,
        maxTokens: 4096,
      },
      expectedLatencyMs: 5000,
      costProfile: {
        inputTokenCost: 0.003,
        outputTokenCost: 0.015,
        currency: 'USD',
      },
    };
  }

  async onTaskReceived(
    input: TaskInput<PlannerInput>,
    services: AgentServices
  ): Promise<TaskOutput<PlannerOutput>> {
    const { task, payload } = input;
    const startTime = Date.now();

    services.logger.info('Planning task', { taskId: task.id, objective: payload.objective });

    try {
      // Step 1: Generate plan using model
      const plan = await this.generatePlan(payload, services);

      // Step 2: Spawn subtasks based on plan
      const subtaskIds = await this.spawnSubtasks(task.id, plan, services);

      // Step 3: Wait for and collect results
      const subtaskResults = await this.collectResults(subtaskIds, services);

      // Step 4: Synthesize final output
      const summary = await this.synthesizeResults(payload.objective, subtaskResults, services);

      return this.success(task.id, { plan, subtaskResults, summary }, {
        latencyMs: Date.now() - startTime,
        modelCallCount: 2,
      });
    } catch (error) {
      return this.failure(task.id, {
        code: 'PLANNING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
        suggestedAction: 'Retry with simplified objective',
      });
    }
  }

  private async generatePlan(
    payload: PlannerInput,
    services: AgentServices
  ): Promise<TaskPlan> {
    const prompt = `You are a task planning agent. Decompose this objective into concrete steps.

Objective: ${payload.objective}
${payload.constraints ? `Constraints: ${payload.constraints.join(', ')}` : ''}
${payload.maxSubtasks ? `Maximum subtasks: ${payload.maxSubtasks}` : ''}

Respond with a JSON plan:
{
  "steps": [
    { "id": "step-1", "description": "...", "agentRole": "coder|researcher|critic|...", "dependencies": [], "priority": 1 }
  ],
  "estimatedDuration": <minutes>,
  "riskAssessment": "..."
}`;

    const response = await services.model.complete(prompt, { temperature: 0.3 });

    // Parse JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse plan from model response');
    }

    return JSON.parse(jsonMatch[0]) as TaskPlan;
  }

  private async spawnSubtasks(
    parentTaskId: UUID,
    plan: TaskPlan,
    services: AgentServices
  ): Promise<Map<string, UUID>> {
    const subtaskIds = new Map<string, UUID>();

    // Sort by dependencies (topological sort would be better, but simple for now)
    const sortedSteps = [...plan.steps].sort((a, b) => a.dependencies.length - b.dependencies.length);

    for (const step of sortedSteps) {
      const subtaskId = await services.mesh.spawnSubtask(
        `${step.agentRole}_task`,
        {
          description: step.description,
          parentTaskId,
          stepId: step.id,
        },
        { priority: step.priority }
      );
      subtaskIds.set(step.id, subtaskId);
    }

    return subtaskIds;
  }

  private async collectResults(
    subtaskIds: Map<string, UUID>,
    services: AgentServices
  ): Promise<SubtaskResult[]> {
    const results: SubtaskResult[] = [];

    for (const [stepId, subtaskId] of subtaskIds) {
      try {
        const result = await services.mesh.awaitSubtask(subtaskId, 60000);
        results.push({
          subtaskId,
          status: result.status === 'completed' ? 'completed' : 'failed',
          agentId: subtaskId, // Would come from actual result
          summary: `Step ${stepId} ${result.status}`,
        });
      } catch {
        results.push({
          subtaskId,
          status: 'failed',
          agentId: subtaskId,
          summary: `Step ${stepId} timed out`,
        });
      }
    }

    return results;
  }

  private async synthesizeResults(
    objective: string,
    results: SubtaskResult[],
    services: AgentServices
  ): Promise<string> {
    const successful = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    const prompt = `Summarize the execution of this plan:
Objective: ${objective}
Results: ${successful} succeeded, ${failed} failed
Details: ${results.map((r) => r.summary).join('; ')}

Provide a brief executive summary.`;

    const response = await services.model.complete(prompt, { maxTokens: 500 });
    return response.content;
  }
}
