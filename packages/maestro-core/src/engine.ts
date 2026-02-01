/**
 * Maestro Orchestration Engine
 * Core DAG execution engine with retry, compensation, and state persistence
 */

import { EventEmitter } from "events";
import { ForkDetector } from "./fork_detector";

export interface WorkflowStep {
  id: string;
  name: string;
  plugin: string;
  config: Record<string, any>;
  depends_on?: string[];
  retry?: {
    max_attempts: number;
    backoff_ms: number;
    exponential: boolean;
  };
  timeout_ms?: number;
  compensation?: {
    plugin: string;
    config: Record<string, any>;
  };
}

export interface WorkflowDefinition {
  name: string;
  version: string;
  steps: WorkflowStep[];
  global_timeout_ms?: number;
  on_failure?: "stop" | "continue" | "compensate";
  schedule_policy?: "balanced" | "fork_first" | "speed_first";
}

export interface RunContext {
  run_id: string;
  workflow: WorkflowDefinition;
  tenant_id: string;
  triggered_by: string;
  environment: string;
  parameters: Record<string, any>;
  idempotency_key?: string;
  budget?: {
    max_cost_usd?: number;
    max_duration_ms?: number;
  };
}

export interface StepExecution {
  step_id: string;
  run_id: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  attempt: number;
  started_at?: Date;
  completed_at?: Date;
  output?: any;
  error?: string;
  cost_usd?: number;
  metadata: Record<string, any>;
  idempotency_key?: string;
  last_heartbeat?: Date;
  worker_id?: string;
}

export interface StepPlugin {
  name: string;
  validate(config: any): void;
  execute(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<{
    output?: any;
    cost_usd?: number;
    metadata?: Record<string, any>;
  }>;
  compensate?(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<void>;
}

export class MaestroEngine extends EventEmitter {
  private plugins = new Map<string, StepPlugin>();
  private activeRuns = new Map<string, RunContext>();

  constructor(
    private stateStore: StateStore,
    private artifactStore: ArtifactStore,
    private policyEngine: PolicyEngine,
  ) {
    super();
  }

  registerPlugin(plugin: StepPlugin): void {
    this.plugins.set(plugin.name, plugin);
    this.emit("plugin:registered", { name: plugin.name });
  }

  async recover(): Promise<void> {
    const activeExecutions = await this.stateStore.getActiveExecutions();
    const runIds = [...new Set(activeExecutions.map((e) => e.run_id))];

    for (const runId of runIds) {
      const runDetails = await this.stateStore.getRunDetails(runId);
      if (!runDetails || !runDetails.workflow_definition) continue;

      const context: RunContext = {
        run_id: runDetails.run_id,
        workflow: runDetails.workflow_definition,
        tenant_id: runDetails.tenant_id,
        triggered_by: runDetails.triggered_by,
        environment: runDetails.environment,
        parameters: runDetails.parameters,
        budget: runDetails.budget,
      };

      this.activeRuns.set(runId, context);
      setImmediate(() => this.executeWorkflow(context));
    }
  }

  async startRun(context: RunContext): Promise<string> {
    this.validateWorkflow(context.workflow);
    const permitted = await this.policyEngine.check(
      "workflow:execute",
      context.tenant_id,
      {
        workflow: context.workflow.name,
        environment: context.environment,
        budget: context.budget,
      },
    );

    if (!permitted.allowed) {
      throw new Error(`Policy denied: ${permitted.reason}`);
    }

    await this.stateStore.createRun(context);
    this.activeRuns.set(context.run_id, context);

    for (const step of context.workflow.steps) {
      await this.stateStore.createStepExecution({
        step_id: step.id,
        run_id: context.run_id,
        status: "pending",
        attempt: 0,
        metadata: {},
      });
    }

    this.emit("run:started", { run_id: context.run_id });
    setImmediate(() => this.executeWorkflow(context));
    return context.run_id;
  }

  private async executeWorkflow(context: RunContext): Promise<void> {
    try {
      if (context.workflow.schedule_policy === "fork_first") {
        await this.executeWorkflowForkFirst(context);
      } else {
        const steps = this.topologicalSort(context.workflow.steps);
        for (const step of steps) {
          const ready = await this.areDepenciesSatisfied(context.run_id, step);
          if (!ready) continue;
          await this.executeStepWithRetry(context, step);
          const runStatus = await this.stateStore.getRunStatus(context.run_id);
          if (runStatus === "cancelled" || runStatus === "failed") break;
        }
        await this.completeRun(context);
      }
    } catch (error) {
      await this.handleRunFailure(context, error as Error);
    }
  }

  private async executeWorkflowForkFirst(context: RunContext): Promise<void> {
    const remainingSteps = new Set(context.workflow.steps.map((s) => s.id));
    const stepMap = new Map(context.workflow.steps.map((s) => [s.id, s]));
    while (remainingSteps.size > 0) {
      const readySteps: WorkflowStep[] = [];
      for (const stepId of remainingSteps) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const step = stepMap.get(stepId)!;
        if (await this.areDepenciesSatisfied(context.run_id, step)) readySteps.push(step);
      }
      if (readySteps.length === 0) throw new Error("Deadlock detected: steps remaining but none ready.");
      const prioritized = ForkDetector.prioritize(readySteps);
      const nextStep = prioritized[0];
      await this.executeStepWithRetry(context, nextStep);
      remainingSteps.delete(nextStep.id);
      const runStatus = await this.stateStore.getRunStatus(context.run_id);
      if (runStatus === "cancelled" || runStatus === "failed") break;
    }
    const finalStatus = await this.stateStore.getRunStatus(context.run_id);
    if (finalStatus !== "failed" && finalStatus !== "cancelled") await this.completeRun(context);
  }

  private async executeStepWithRetry(context: RunContext, step: WorkflowStep): Promise<void> {
    const existing = await this.stateStore.getStepExecution(context.run_id, step.id);
    if (existing?.status === "succeeded") return;
    const plugin = this.plugins.get(step.plugin);
    if (!plugin) throw new Error(`Plugin not found: ${step.plugin}`);
    const maxAttempts = step.retry?.max_attempts ?? 1;
    let attempt = 1;
    while (attempt <= maxAttempts) {
      const execution: StepExecution = {
        step_id: step.id,
        run_id: context.run_id,
        status: "running",
        attempt,
        started_at: new Date(),
        metadata: {},
      };
      await this.stateStore.updateStepExecution(execution);
      try {
        const timeoutMs = step.timeout_ms ?? 300000;
        const result = await Promise.race([
          plugin.execute(context, step, execution),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Step timeout")), timeoutMs)),
        ]);
        execution.status = "succeeded";
        execution.completed_at = new Date();
        execution.output = result.output;
        execution.cost_usd = result.cost_usd;
        execution.metadata = { ...execution.metadata, ...result.metadata };
        await this.stateStore.updateStepExecution(execution);
        this.emit("step:completed", { run_id: context.run_id, step_id: step.id });
        return;
      } catch (error) {
        execution.status = "failed";
        execution.completed_at = new Date();
        execution.error = (error as Error).message;
        await this.stateStore.updateStepExecution(execution);
        if (attempt === maxAttempts) {
          this.emit("step:failed", { run_id: context.run_id, step_id: step.id, error: execution.error });
          if (step.compensation) await this.executeCompensation(context, step, execution);
          throw error;
        }
        const backoffMs = step.retry?.backoff_ms ?? 1000;
        const delay = step.retry?.exponential ? backoffMs * Math.pow(2, attempt - 1) : backoffMs;
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }
  }

  private async executeCompensation(context: RunContext, step: WorkflowStep, execution: StepExecution): Promise<void> {
    if (!step.compensation) return;
    const plugin = this.plugins.get(step.compensation.plugin);
    if (!plugin || !plugin.compensate) return;
    try {
      await plugin.compensate(context, step, execution);
      this.emit("step:compensated", { run_id: context.run_id, step_id: step.id });
    } catch (error) {
      this.emit("step:compensation_failed", { run_id: context.run_id, step_id: step.id, error: (error as Error).message });
    }
  }

  private topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: WorkflowStep[] = [];
    const stepMap = new Map(steps.map((s) => [s.id, s]));
    function visit(stepId: string): void {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) throw new Error(`Circular dependency detected: ${stepId}`);
      visiting.add(stepId);
      const step = stepMap.get(stepId);
      if (step?.depends_on) {
        for (const dep of step.depends_on) visit(dep);
      }
      visiting.delete(stepId);
      visited.add(stepId);
      if (step) result.push(step);
    }
    for (const step of steps) visit(step.id);
    return result;
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.name || !workflow.version || !workflow.steps) throw new Error("Invalid workflow definition");
    const stepIds = new Set(workflow.steps.map((s) => s.id));
    for (const step of workflow.steps) {
      if (!this.plugins.has(step.plugin)) throw new Error(`Unknown plugin: ${step.plugin}`);
      if (step.depends_on) {
        for (const dep of step.depends_on) {
          if (!stepIds.has(dep)) throw new Error(`Unknown dependency: ${dep} for step ${step.id}`);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const plugin = this.plugins.get(step.plugin)!;
      plugin.validate(step.config);
    }
  }

  private async areDepenciesSatisfied(runId: string, step: WorkflowStep): Promise<boolean> {
    if (!step.depends_on || step.depends_on.length === 0) return true;
    for (const depId of step.depends_on) {
      const execution = await this.stateStore.getStepExecution(runId, depId);
      if (!execution || execution.status !== "succeeded") return false;
    }
    return true;
  }

  private async completeRun(context: RunContext): Promise<void> {
    await this.stateStore.updateRunStatus(context.run_id, "completed");
    this.activeRuns.delete(context.run_id);
    this.emit("run:completed", { run_id: context.run_id });
  }

  private async handleRunFailure(context: RunContext, error: Error): Promise<void> {
    await this.stateStore.updateRunStatus(context.run_id, "failed", error.message);
    this.activeRuns.delete(context.run_id);
    this.emit("run:failed", { run_id: context.run_id, error: error.message });
  }

  async cancelRun(runId: string): Promise<void> {
    await this.stateStore.updateRunStatus(runId, "cancelled");
    this.activeRuns.delete(runId);
    this.emit("run:cancelled", { run_id: runId });
  }

  // eslint-disable-next-line require-await
  async getRunStatus(runId: string): Promise<any> {
    return this.stateStore.getRunDetails(runId);
  }
}

export interface StateStore {
  createRun(context: RunContext): Promise<void>;
  updateRunStatus(runId: string, status: string, error?: string): Promise<void>;
  getRunStatus(runId: string): Promise<string>;
  getRunDetails(runId: string): Promise<any>;
  createStepExecution(execution: StepExecution): Promise<void>;
  updateStepExecution(execution: StepExecution): Promise<void>;
  getStepExecution(runId: string, stepId: string): Promise<StepExecution | null>;
  getActiveExecutions(): Promise<StepExecution[]>;
}

export interface ArtifactStore {
  store(runId: string, stepId: string, name: string, data: Buffer): Promise<string>;
  retrieve(runId: string, stepId: string, name: string): Promise<Buffer>;
  list(runId: string): Promise<string[]>;
}

export interface PolicyEngine {
  check(action: string, subject: string, attributes: Record<string, any>): Promise<{ allowed: boolean; reason?: string }>;
}
