import { AssetDiscoveryEngine } from './discovery';
import { AnomalyDetector } from './anomaly';
import { HealthMonitor } from './monitoring';
import { SelfHealingOrchestrator } from './self-healing';
import { CostLatencyOptimizer } from './optimization';
import { JobRouter } from './job-router';
import { ExecutionTracer } from './tracing';
import { GuardrailEngine } from './guardrails';
import { CiGateway } from './ci-gateway';
import {
  PredictiveInsightEngine,
  type PredictiveInsightEngineOptions,
  type PredictiveInsight,
} from './predictive-insights';
import type {
  AnomalySignal,
  DiscoveryEvent,
  DiscoveryProvider,
  HealthSignal,
  IncidentReport,
  OrchestrationTask,
  OptimizationSample,
  PolicyHook,
  ResponseStrategy,
  RoutingPlan,
  GuardrailHook,
  TaskExecutionResult,
  CiCheck,
} from './types';
import type { AnomalyDetectorOptions } from './anomaly';
import type { SelfHealingOrchestratorOptions } from './self-healing';
import type { CostLatencyOptimizerOptions } from './optimization';
import type { JobRouterOptions } from './job-router';
import type { JobSpec } from './types';

export interface MaestroConductorOptions {
  anomaly?: AnomalyDetectorOptions;
  selfHealing?: SelfHealingOrchestratorOptions;
  optimizer?: CostLatencyOptimizerOptions;
  jobRouter?: JobRouterOptions;
  insights?: PredictiveInsightEngineOptions;
}

export class MaestroConductor {
  private readonly discovery = new AssetDiscoveryEngine();

  private readonly anomaly: AnomalyDetector;

  private readonly monitor = new HealthMonitor();

  private readonly selfHealing: SelfHealingOrchestrator;

  private readonly optimizer: CostLatencyOptimizer;

  private readonly jobRouter: JobRouter;

  private readonly policyHooks: PolicyHook[] = [];

  private readonly incidents: IncidentReport[] = [];

  private readonly insights?: PredictiveInsightEngine;

  private readonly guardrails = new GuardrailEngine();

  private readonly ciGateway = new CiGateway();

  private readonly tracer = new ExecutionTracer();

  constructor(options?: MaestroConductorOptions) {
    this.anomaly = new AnomalyDetector(options?.anomaly);
    this.selfHealing = new SelfHealingOrchestrator(options?.selfHealing);
    this.optimizer = new CostLatencyOptimizer(options?.optimizer);
    this.jobRouter = new JobRouter(options?.jobRouter);
    if (options?.insights) {
      this.insights = new PredictiveInsightEngine(options.insights);
    }
  }

  registerDiscoveryProvider(provider: DiscoveryProvider): void {
    this.discovery.registerProvider(provider);
  }

  onDiscovery(listener: (event: DiscoveryEvent) => void): void {
    this.discovery.on('event', listener);
  }

  async scanAssets(): Promise<DiscoveryEvent[]> {
    return this.discovery.scanAndRegister();
  }

  listAssets() {
    return this.discovery.listAssets();
  }

  registerPolicyHook(hook: PolicyHook): void {
    this.policyHooks.push(hook);
  }

  registerGuardrail(guardrail: GuardrailHook): void {
    this.guardrails.register(guardrail);
  }

  registerCiCheck(check: CiCheck): void {
    this.ciGateway.register(check);
  }

  registerResponseStrategy(strategy: ResponseStrategy): void {
    this.selfHealing.registerStrategy(strategy);
  }

  getIncidents(): IncidentReport[] {
    return [...this.incidents];
  }

  getOptimizationRecommendations() {
    return this.optimizer.getRecommendations();
  }

  getPerformanceSnapshots() {
    return this.optimizer.listSnapshots();
  }

  getPredictiveInsights(serviceId?: string): PredictiveInsight[] {
    if (!this.insights) {
      return [];
    }
    if (serviceId) {
      const asset = this.discovery.getAsset(serviceId);
      const environmentId = asset?.region ?? asset?.labels?.environment ?? 'unknown';
      const insight = this.insights.buildInsight(serviceId, environmentId);
      return insight ? [insight] : [];
    }
    return this.insights.listHighRiskInsights();
  }

  async ingestHealthSignal(signal: HealthSignal): Promise<void> {
    this.monitor.ingest(signal);
    const sample = this.toOptimizationSample(signal);
    if (sample) {
      this.optimizer.update(sample);
    }
    this.insights?.observeHealthSignal(signal);
    const anomaly = this.anomaly.evaluate(signal);
    if (anomaly) {
      await this.handleAnomaly(anomaly);
    }
  }

  getExecutionTrace(taskId: string) {
    return this.tracer.get(taskId);
  }

  listExecutionTraces() {
    return this.tracer.list();
  }

  async routeJob(job: JobSpec): Promise<RoutingPlan> {
    const assets = this.discovery.listAssets();
    const performance = this.optimizer.listSnapshots();
    if (assets.length === 0) {
      throw new Error('no assets registered');
    }
    return this.jobRouter.route(job, assets, performance, this.policyHooks);
  }

  async executeTask(task: OrchestrationTask): Promise<TaskExecutionResult> {
    this.tracer.start(task.id, task.intent);
    try {
      this.tracer.record(task.id, {
        step: 'discovery',
        status: 'success',
        detail: `assets available: ${this.discovery.listAssets().length}`,
      });

      const plan = await this.routeJob(task.job);
      this.tracer.record(task.id, {
        step: 'routing',
        status: 'success',
        detail: `primary ${plan.primary.assetId}`,
        metadata: { fallbacks: plan.fallbacks.map((fallback) => fallback.assetId) },
      });

      const guardrails: TaskExecutionResult['guardrails'] = [];
      const ciChecks: TaskExecutionResult['ciChecks'] = [];
      const fallbacksTried: string[] = [];
      let selected: TaskExecutionResult['selected'];

      for (const decision of [plan.primary, ...plan.fallbacks]) {
        const asset = this.discovery.getAsset(decision.assetId);
        if (!asset) {
          this.tracer.record(task.id, {
            step: 'routing',
            status: 'failed',
            detail: `asset ${decision.assetId} missing from registry`,
          });
          fallbacksTried.push(decision.assetId);
          continue;
        }

        const guardrailEvaluation = await this.guardrails.evaluate(
          {
            asset,
            job: task.job,
            intent: task.intent,
            taskId: task.id,
            context: task.context,
          },
          decision,
        );
        guardrails.push(guardrailEvaluation);

        if (guardrailEvaluation.errors.length > 0) {
          this.tracer.record(task.id, {
            step: 'guardrail',
            status: 'failed',
            detail: `guardrail errors: ${guardrailEvaluation.errors
              .map((result) => result.id)
              .join(',')}`,
            metadata: {
              assetId: decision.assetId,
              errors: guardrailEvaluation.errors.map((result) => result.error),
            },
          });
        }

        if (guardrailEvaluation.blocked) {
          this.tracer.record(task.id, {
            step: 'guardrail',
            status: 'failed',
            detail: `blocked by ${guardrailEvaluation.results
              .filter((result) => result.severity === 'block')
              .map((result) => result.id)
              .join(',')}`,
            metadata: { assetId: decision.assetId },
          });
          fallbacksTried.push(decision.assetId);
          this.tracer.record(task.id, {
            step: 'fallback',
            status: 'success',
            detail: `attempting fallback after guardrail block`,
            metadata: { assetId: decision.assetId },
          });
          continue;
        }

        if (guardrailEvaluation.warnings.length > 0) {
          this.tracer.record(task.id, {
            step: 'guardrail',
            status: 'skipped',
            detail: `warnings: ${guardrailEvaluation.warnings
              .map((warning) => warning.id)
              .join(',')}`,
            metadata: { assetId: decision.assetId },
          });
        } else {
          this.tracer.record(task.id, {
            step: 'guardrail',
            status: 'success',
            detail: `guardrails passed for ${decision.assetId}`,
            metadata: { assetId: decision.assetId },
          });
        }

        const ciResults = await this.ciGateway.evaluate(task);
        ciChecks.push(...ciResults);
        const blockingCheck = ciResults.find(
          (result) => !result.passed && (result.required ?? true),
        );
        if (blockingCheck) {
          this.tracer.record(task.id, {
            step: 'ci-check',
            status: 'failed',
            detail: `ci check ${blockingCheck.id} failed`,
            metadata: {
              assetId: decision.assetId,
              error: blockingCheck.error,
            },
          });
          fallbacksTried.push(decision.assetId);
          continue;
        }

        this.tracer.record(task.id, {
          step: 'ci-check',
          status: 'success',
          detail: `ci checks passed for ${decision.assetId}`,
          metadata: { assetId: decision.assetId },
        });

        selected = decision;
        break;
      }

      if (selected) {
        this.tracer.complete(task.id, 'completed', { assetId: selected.assetId });
        this.tracer.record(task.id, {
          step: 'complete',
          status: 'success',
          detail: `task routed to ${selected.assetId}`,
          metadata: { assetId: selected.assetId },
        });
      } else {
        this.tracer.complete(task.id, 'failed', {
          message: 'no eligible assets after guardrails or ci checks',
        });
        this.tracer.record(task.id, {
          step: 'error',
          status: 'failed',
          detail: 'task failed guardrail/ci checks for all candidates',
        });
      }

      return {
        task,
        plan,
        selected,
        guardrails,
        ciChecks,
        trace: this.tracer.get(task.id)!,
        fallbacksTried,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected execution failure';
      this.tracer.record(task.id, {
        step: 'error',
        status: 'failed',
        detail: message,
      });
      this.tracer.complete(task.id, 'failed', { error: message });
      throw error;
    }
  }

  private toOptimizationSample(
    signal: HealthSignal,
  ): OptimizationSample | undefined {
    const sample: OptimizationSample = {
      assetId: signal.assetId,
      timestamp: signal.timestamp,
    };
    const metric = signal.metric.toLowerCase();
    if (metric.includes('latency')) {
      sample.latencyMs = signal.value;
    }
    if (metric.includes('cost')) {
      sample.costPerHour = signal.value;
    }
    if (metric.includes('throughput') || metric.includes('qps')) {
      sample.throughput = signal.value;
    }
    if (metric.includes('error')) {
      sample.errorRate = signal.value;
    }
    if (metric.includes('saturation') || metric.includes('utilization')) {
      sample.saturation = signal.value;
      sample.computeUtilization = signal.value;
    }

    if (
      sample.latencyMs === undefined &&
      sample.costPerHour === undefined &&
      sample.throughput === undefined &&
      sample.errorRate === undefined &&
      sample.saturation === undefined &&
      sample.computeUtilization === undefined
    ) {
      return undefined;
    }
    return sample;
  }

  private async handleAnomaly(anomaly: AnomalySignal): Promise<void> {
    const asset =
      this.discovery.getAsset(anomaly.assetId) ??
      ({
        id: anomaly.assetId,
        name: anomaly.assetId,
        kind: 'microservice',
      } as const);
    const snapshot =
      this.monitor.getSnapshot(anomaly.assetId) ??
      ({
        assetId: anomaly.assetId,
        lastUpdated: anomaly.timestamp,
        metrics: {},
        annotations: [],
      } as const);

    const context = {
      asset,
      anomaly,
      snapshot,
      policies: this.policyHooks,
    };
    const { plans } = await this.selfHealing.orchestrate(context);
    const incident: IncidentReport = {
      id: `${anomaly.assetId}:${anomaly.metric}:${Date.now()}`,
      asset,
      anomaly,
      snapshot,
      plans,
      timestamp: new Date(),
    };
    this.incidents.push(incident);
  }
}
