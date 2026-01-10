import { ToolRouter, ToolRoute } from './tool-router.js';
import { EpisodeMemory, CaseLearningStore } from './memory.js';

export type AgentMode = 'read_advise' | 'recommend_plan' | 'act';

export interface AgentBudget {
  maxSteps: number;
  maxCostUsd: number;
}

export interface AgentRoleConfig {
  role: string;
  tools: ToolRoute[];
  mode: AgentMode;
  budget: AgentBudget;
  requiredEvidence: string[];
  escalationPolicy: {
    requiresApproval: boolean;
    approverRoles: string[];
    reason: string;
  };
}

export interface AgentExecutionContext {
  tenantId: string;
  incidentId: string;
  mode: AgentMode;
  evidenceIds: string[];
  requestedScope?: string;
}

export interface AgentStepResult {
  success: boolean;
  costUsd: number;
  output: Record<string, unknown>;
  policyDecision: 'allow' | 'deny' | 'review';
  reason?: string;
}

export class AgentRuntime {
  private readonly router: ToolRouter;
  private readonly memory: EpisodeMemory;
  private readonly learnings: CaseLearningStore;

  constructor(private readonly config: AgentRoleConfig) {
    this.router = new ToolRouter(config.tools, config.budget);
    this.memory = new EpisodeMemory();
    this.learnings = new CaseLearningStore();
  }

  runBoundedWorkflow(
    context: AgentExecutionContext,
    plan: string[],
    evaluator: (step: string, mode: AgentMode) => AgentStepResult
  ): AgentStepResult[] {
    const results: AgentStepResult[] = [];
    for (const step of plan) {
      if (!this.router.canExecute(step, context.mode)) {
        results.push({
          success: false,
          costUsd: 0,
          output: {},
          policyDecision: 'deny',
          reason: `Step ${step} not permitted for mode ${context.mode}`
        });
        continue;
      }

      const decision = evaluator(step, context.mode);
      this.router.trackCost(decision.costUsd);
      this.router.trackStep();
      this.memory.recordStep({
        incidentId: context.incidentId,
        step,
        mode: context.mode,
        decision
      });
      results.push(decision);

      if (!decision.success) {
        break;
      }
    }

    this.learnings.persistContext(context.incidentId, this.memory.toSummary());
    return results;
  }
}
