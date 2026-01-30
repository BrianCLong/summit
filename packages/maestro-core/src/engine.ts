/**
 * Maestro Orchestration Engine
 * Core DAG execution engine with retry, compensation, and state persistence
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';

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
  on_failure?: 'stop' | 'continue' | 'compensate';
}

export interface RunContext {
  run_id: string;
  workflow: WorkflowDefinition;
  tenant_id: string;
  triggered_by: string;
  environment: string;
  parameters: Record<string, any>;
  budget?: {
    max_cost_usd?: number;
    max_duration_ms?: number;
  };
}

export interface StepExecution {
  step_id: string;
  run_id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  attempt: number;
  started_at?: Date;
  completed_at?: Date;
  output?: any;
  error?: string;
  cost_usd?: number;
  metadata: Record<string, any>;
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
    this.emit('plugin:registered', { name: plugin.name });
  }

  async startRun(context: RunContext): Promise<string> {
    // Validate workflow definition
    this.validateWorkflow(context.workflow);

    // Check policy permissions
    const permitted = await this.policyEngine.check(
      'workflow:execute',
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

    // Initialize run state
    await this.stateStore.createRun(context);
    this.activeRuns.set(context.run_id, context);

    // Initialize all steps as pending
    for (const step of context.workflow.steps) {
      await this.stateStore.createStepExecution({
        step_id: step.id,
        run_id: context.run_id,
        status: 'pending',
        attempt: 0,
        metadata: {},
      });
    }

    this.emit('run:started', { run_id: context.run_id });

    // Start execution (async)
    setImmediate(() => this.executeWorkflow(context));

    return context.run_id;
  }

  private async executeWorkflow(context: RunContext): Promise<void> {
    try {
      const steps = this.topologicalSort(context.workflow.steps);

      for (const step of steps) {
        // Check if dependencies are satisfied
        const ready = await this.areDepenciesSatisfied(context.run_id, step);
        if (!ready) {
          continue; // Will be picked up in next iteration
        }

        // Execute step with retry logic
        await this.executeStepWithRetry(context, step);

        // Check if run should continue
        const runStatus = await this.stateStore.getRunStatus(context.run_id);
        if (runStatus === 'cancelled' || runStatus === 'failed') {
          break;
        }
      }

      await this.completeRun(context);
    } catch (error) {
      await this.handleRunFailure(context, error as Error);
    }
  }

  private async executeStepWithRetry(
    context: RunContext,
    step: WorkflowStep,
  ): Promise<void> {
    const plugin = this.plugins.get(step.plugin);
    if (!plugin) {
      throw new Error(`Plugin not found: ${step.plugin}`);
    }

    const maxAttempts = step.retry?.max_attempts ?? 1;
    let attempt = 1;

    while (attempt <= maxAttempts) {
      const execution: StepExecution = {
        step_id: step.id,
        run_id: context.run_id,
        status: 'running',
        attempt,
        started_at: new Date(),
        metadata: {},
      };

      await this.stateStore.updateStepExecution(execution);

      try {
        // Execute with timeout
        const timeoutMs = step.timeout_ms ?? 300000; // 5 minutes default
        const result = await Promise.race([
          plugin.execute(context, step, execution),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Step timeout')), timeoutMs),
          ),
        ]);

        // Success
        execution.status = 'succeeded';
        execution.completed_at = new Date();
        execution.output = result.output;
        execution.cost_usd = result.cost_usd;
        execution.metadata = { ...execution.metadata, ...result.metadata };

        await this.stateStore.updateStepExecution(execution);
        this.emit('step:completed', {
          run_id: context.run_id,
          step_id: step.id,
        });
        return;
      } catch (error) {
        // Failure
        execution.status = 'failed';
        execution.completed_at = new Date();
        execution.error = (error as Error).message;

        await this.stateStore.updateStepExecution(execution);

        if (attempt === maxAttempts) {
          // Final attempt failed
          this.emit('step:failed', {
            run_id: context.run_id,
            step_id: step.id,
            error: execution.error,
          });

          // Execute compensation if defined
          if (step.compensation) {
            await this.executeCompensation(context, step, execution);
          }

          throw error;
        }

        // Retry with backoff
        const backoffMs = step.retry?.backoff_ms ?? 1000;
        const delay = step.retry?.exponential
          ? backoffMs * Math.pow(2, attempt - 1)
          : backoffMs;

        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }
  }

  private async executeCompensation(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<void> {
    if (!step.compensation) return;

    const plugin = this.plugins.get(step.compensation.plugin);
    if (!plugin || !plugin.compensate) return;

    try {
      await plugin.compensate(context, step, execution);
      this.emit('step:compensated', {
        run_id: context.run_id,
        step_id: step.id,
      });
    } catch (error) {
      this.emit('step:compensation_failed', {
        run_id: context.run_id,
        step_id: step.id,
        error: (error as Error).message,
      });
    }
  }

  private topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: WorkflowStep[] = [];
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    function visit(stepId: string): void {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected: ${stepId}`);
      }

      visiting.add(stepId);
      const step = stepMap.get(stepId);

      if (step?.depends_on) {
        for (const dep of step.depends_on) {
          visit(dep);
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);

      if (step) {
        result.push(step);
      }
    }

    for (const step of steps) {
      visit(step.id);
    }

    return result;
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.name || !workflow.version || !workflow.steps) {
      throw new Error('Invalid workflow definition');
    }

    const stepIds = new Set(workflow.steps.map((s) => s.id));

    for (const step of workflow.steps) {
      // Validate plugin exists
      if (!this.plugins.has(step.plugin)) {
        throw new Error(`Unknown plugin: ${step.plugin}`);
      }

      // Validate dependencies exist
      if (step.depends_on) {
        for (const dep of step.depends_on) {
          if (!stepIds.has(dep)) {
            throw new Error(`Unknown dependency: ${dep} for step ${step.id}`);
          }
        }
      }

      // Validate step config
      const plugin = this.plugins.get(step.plugin)!;
      plugin.validate(step.config);
    }
  }

  private async areDepenciesSatisfied(
    runId: string,
    step: WorkflowStep,
  ): Promise<boolean> {
    if (!step.depends_on || step.depends_on.length === 0) {
      return true;
    }

    for (const depId of step.depends_on) {
      const execution = await this.stateStore.getStepExecution(runId, depId);
      if (!execution || execution.status !== 'succeeded') {
        return false;
      }
    }

    return true;
  }

  private async completeRun(context: RunContext): Promise<void> {
    await this.stateStore.updateRunStatus(context.run_id, 'completed');
    this.activeRuns.delete(context.run_id);
    this.emit('run:completed', { run_id: context.run_id });
  }

  private async handleRunFailure(
    context: RunContext,
    error: Error,
  ): Promise<void> {
    await this.stateStore.updateRunStatus(
      context.run_id,
      'failed',
      error.message,
    );
    this.activeRuns.delete(context.run_id);
    this.emit('run:failed', { run_id: context.run_id, error: error.message });
  }

  async cancelRun(runId: string): Promise<void> {
    await this.stateStore.updateRunStatus(runId, 'cancelled');
    this.activeRuns.delete(runId);
    this.emit('run:cancelled', { run_id: runId });
  }

  async getRunStatus(runId: string): Promise<any> {
    return await this.stateStore.getRunDetails(runId);
  }
}

// Interfaces for dependency injection
export interface StateStore {
  createRun(context: RunContext): Promise<void>;
  updateRunStatus(runId: string, status: string, error?: string): Promise<void>;
  getRunStatus(runId: string): Promise<string>;
  getRunDetails(runId: string): Promise<any>;
  createStepExecution(execution: StepExecution): Promise<void>;
  updateStepExecution(execution: StepExecution): Promise<void>;
  getStepExecution(
    runId: string,
    stepId: string,
  ): Promise<StepExecution | null>;
}

export interface ArtifactStore {
  store(
    runId: string,
    stepId: string,
    name: string,
    data: Buffer,
  ): Promise<string>;
  retrieve(runId: string, stepId: string, name: string): Promise<Buffer>;
  list(runId: string): Promise<string[]>;
}

export interface PolicyEngine {
  check(
    action: string,
    subject: string,
    attributes: Record<string, any>,
  ): Promise<{ allowed: boolean; reason?: string }>;
}
