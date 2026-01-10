import { context, trace } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import {
  AutonomyMode,
  ExecutionOptions,
  OrchestrationPlan,
  PlanContext,
  PlanRequest,
  RunResult,
  Step,
  StepResult,
  StepStatus,
  StepKind,
  OTEL_STATUS_ERROR,
  OTEL_STATUS_OK,
} from './types.js';
import { AllowAllPolicyDecisionProvider, PolicyDecisionProvider } from './policy.js';
import { shapeContext } from './context-shaping.js';
import { InMemoryRunTraceStore, RunTrace } from './run-trace.js';
import { StepHandlers } from './types.js';

export interface OrchestratorOptions {
  policyProvider?: PolicyDecisionProvider;
  runStore?: InMemoryRunTraceStore;
}

export class Orchestrator {
  private policyProvider: PolicyDecisionProvider;
  private runStore: InMemoryRunTraceStore;
  private tracer = trace.getTracer('orchestration');

  constructor(options: OrchestratorOptions = {}) {
    this.policyProvider = options.policyProvider ?? new AllowAllPolicyDecisionProvider();
    this.runStore = options.runStore ?? new InMemoryRunTraceStore();
  }

  plan(request: PlanRequest, evidence: PlanContext): OrchestrationPlan {
    const span = this.tracer.startSpan('plan');
    try {
      const plan: OrchestrationPlan = {
        id: uuidv4(),
        description: request.goal,
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 'retrieve-context',
            name: 'Retrieve contextual evidence',
            kind: 'RETRIEVE',
            inputs: { query: request.goal, provenance: evidence.provenance },
          },
          {
            id: 'fan-out-analysis',
            name: 'Parallel analyzers',
            kind: 'LLM',
            inputs: { context: evidence.shapedContext, shard: 'a' },
            dependencies: ['retrieve-context'],
            parallelGroup: 'analysis',
          },
          {
            id: 'fan-out-analysis-b',
            name: 'Parallel analyzers',
            kind: 'LLM',
            inputs: { context: evidence.shapedContext, shard: 'b' },
            dependencies: ['retrieve-context'],
            parallelGroup: 'analysis',
          },
          {
            id: 'resolve-conflicts',
            name: 'Resolve conflicts',
            kind: 'TRANSFORM',
            inputs: { context: evidence.shapedContext },
            dependencies: ['fan-out-analysis', 'fan-out-analysis-b'],
          },
          {
            id: 'final-synthesis',
            name: 'Synthesize answer',
            kind: 'LLM',
            inputs: { context: evidence.shapedContext },
            dependencies: ['resolve-conflicts'],
          },
        ],
      };
      span.setStatus({ code: OTEL_STATUS_OK });
      return plan;
    } finally {
      span.end();
    }
  }

  async execute(
    plan: OrchestrationPlan,
    options: ExecutionOptions,
    stepHandlers: StepHandlers,
  ): Promise<RunResult> {
    const runId = uuidv4();
    const stepResults: StepResult[] = plan.steps.map((step) => ({
      stepId: step.id,
      status: 'pending',
    }));

    const traceRecord: RunTrace = {
      runId,
      planId: plan.id,
      planSnapshot: plan,
      planContext: options.planContext,
      guardrails: options.guardrails,
      provenance: options.planContext?.provenance,
      mode: options.mode,
      approvals: [],
      policyDecisions: [],
      startedAt: new Date().toISOString(),
      steps: stepResults,
    };

    this.runStore.save(traceRecord);

    return this.executeInternal(plan, options, stepHandlers, traceRecord);
  }

  async resume(runId: string, stepHandlers: StepHandlers): Promise<RunResult> {
    const trace = this.runStore.get(runId);
    if (!trace) {
      throw new Error('run not found');
    }
    const plan = trace.planSnapshot as OrchestrationPlan;
    return this.executeInternal(
      plan,
      {
        mode: trace.mode,
        guardrails: trace.guardrails,
        planContext: trace.planContext,
      },
      stepHandlers,
      trace,
    );
  }

  private async executeInternal(
    plan: OrchestrationPlan,
    options: ExecutionOptions,
    stepHandlers: StepHandlers,
    traceRecord: RunTrace,
  ): Promise<RunResult> {
    const tracer = this.tracer;
    const runSpan = tracer.startSpan('execute', undefined, context.active());
    let currentMode = traceRecord.mode ?? options.mode;
    traceRecord.mode = currentMode;

    const stepResults = traceRecord.steps;
    const completed = new Set(stepResults.filter((s) => s.status === 'completed').map((s) => s.stepId));
    const blocked = new Set(
      stepResults.filter((s) => s.status === 'blocked' || s.status === 'failed').map((s) => s.stepId),
    );
    const pendingApprovals = new Set(stepResults.filter((s) => s.status === 'waiting_approval').map((s) => s.stepId));

    const readyQueue = new Set(
      plan.steps.filter((step) => {
        const result = stepResults.find((s) => s.stepId === step.id);
        if (!result || result.status === 'completed' || result.status === 'blocked' || result.status === 'failed') {
          return false;
        }
        if (result.status === 'waiting_approval') return false;
        const deps = step.dependencies ?? [];
        if (deps.some((dep) => blocked.has(dep))) {
          result.status = 'blocked';
          result.error = `dependency blocked: ${deps.find((dep) => blocked.has(dep))}`;
          this.runStore.appendStepResult(traceRecord.runId, result);
          blocked.add(step.id);
          return false;
        }
        return deps.every((dep) => completed.has(dep));
      }),
    );

    try {
      while (readyQueue.size > 0 || pendingApprovals.size > 0) {
        const parallelGroups: Record<string, Step[]> = {};
        for (const step of readyQueue) {
          const groupKey = step.parallelGroup ?? step.id;
          parallelGroups[groupKey] = parallelGroups[groupKey] ?? [];
          parallelGroups[groupKey].push(step);
        }

        readyQueue.clear();

        const groupPromises = Object.values(parallelGroups).map(async (group) => {
          await Promise.all(
            group.map(async (step) => {
              const span = tracer.startSpan(`step:${step.id}`, undefined, context.active());
              const decision = await this.policyProvider.beforeStep(step, {
                mode: currentMode,
                runId: traceRecord.runId,
                planId: traceRecord.planId,
                guardrails: options.guardrails,
                planContext: options.planContext,
              });
              traceRecord.policyDecisions.push({
                stepId: step.id,
                action: decision.action,
                reason: 'reason' in decision ? decision.reason : undefined,
                mode: decision.action === 'downgrade_mode' ? decision.mode : undefined,
              });

              const result = stepResults.find((s) => s.stepId === step.id)!;
              result.startedAt = new Date().toISOString();
              result.policyDecision = decision.action;

              if (decision.action === 'block') {
                result.status = 'blocked';
                result.error = decision.reason;
                span.setStatus({ code: OTEL_STATUS_ERROR, message: decision.reason });
                this.runStore.appendStepResult(traceRecord.runId, result);
                blocked.add(step.id);
                span.end();
                return;
              }

              if (decision.action === 'downgrade_mode' && currentMode === 'HOOTL') {
                currentMode = decision.mode;
                traceRecord.mode = currentMode;
              }

              if (decision.action === 'require_approval' || (step.kind === 'HUMAN_APPROVAL' && currentMode === 'HITL')) {
                result.status = 'waiting_approval';
                this.runStore.appendStepResult(traceRecord.runId, result);
                pendingApprovals.add(step.id);
                span.end();
                return;
              }

              result.status = 'running';
              this.runStore.appendStepResult(traceRecord.runId, result);

              try {
                const output = await stepHandlers[step.kind]?.(step);
                result.output = decision.action === 'redact_output' ? '[redacted]' : output;
                result.status = 'completed';
                result.completedAt = new Date().toISOString();
                span.setStatus({ code: OTEL_STATUS_OK });
              } catch (error: any) {
                result.status = 'failed';
                result.error = error?.message ?? 'Step failed';
                span.setStatus({ code: OTEL_STATUS_ERROR, message: result.error });
                blocked.add(step.id);
              }

              this.runStore.appendStepResult(traceRecord.runId, result);
              completed.add(step.id);
              span.end();
            }),
          );
        });

        await Promise.all(groupPromises);

        const newlyReady = plan.steps.filter((step) => {
          if (completed.has(step.id) || pendingApprovals.has(step.id) || blocked.has(step.id)) return false;
          const result = stepResults.find((s) => s.stepId === step.id);
          if (!result || result.status === 'waiting_approval') return false;
          const deps = step.dependencies ?? [];
          if (deps.some((dep) => blocked.has(dep))) {
            result.status = 'blocked';
            result.error = `dependency blocked: ${deps.find((dep) => blocked.has(dep))}`;
            this.runStore.appendStepResult(traceRecord.runId, result);
            blocked.add(step.id);
            return false;
          }
          return deps.every((dep) => completed.has(dep));
        });
        newlyReady.forEach((step) => readyQueue.add(step));

        if (newlyReady.length === 0 && pendingApprovals.size > 0) {
          break;
        }
      }

      const completedAt = new Date().toISOString();
      const result: RunResult = {
        runId: traceRecord.runId,
        planId: traceRecord.planId,
        mode: currentMode,
        startedAt: traceRecord.startedAt,
        completedAt,
        steps: stepResults,
      };
      this.runStore.save({ ...traceRecord, ...result });
      runSpan.setStatus({ code: OTEL_STATUS_OK });
      return result;
    } catch (error: any) {
      runSpan.setStatus({ code: OTEL_STATUS_ERROR, message: error?.message });
      throw error;
    } finally {
      runSpan.end();
    }
  }

  async approveStep(runId: string, stepId: string, actor = 'human-approver'): Promise<void> {
    const run = this.runStore.get(runId);
    if (!run) throw new Error('run not found');
    const stepResult = run.steps.find((s) => s.stepId === stepId);
    if (!stepResult || stepResult.status !== 'waiting_approval') {
      throw new Error('step not awaiting approval');
    }
    this.runStore.addApproval(runId, {
      stepId,
      approvedBy: actor,
      approvedAt: new Date().toISOString(),
    });
    stepResult.status = 'pending';
    this.runStore.appendStepResult(runId, stepResult);
  }

  getRun(runId: string) {
    return this.runStore.get(runId);
  }

  shapeContext = shapeContext;
}
