/**
 * EvoForge deployment orchestration helpers.
 *
 * This module intentionally stays declarative: it wires validation hooks and
 * rollout metadata into the existing FeatureDeploymentPipeline without
 * altering runtime behavior. Default endpoints and metrics are placeholders to
 * keep the integration testable in isolation while documenting expected
 * surface area for consumers.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  DeploymentEnvironment,
  DeploymentPipeline,
  DeploymentRequest,
  FeatureDeploymentPipeline,
  HealthCheck,
  RolloutPlan,
} from '../deployment/FeatureDeploymentPipeline.js';
import { FeatureFlagManager } from '../core/FeatureFlagManager.js';
import { Counter, Histogram, PrometheusRegistry } from 'prom-client';

const execFileAsync = promisify(execFile);

export interface CommandExecutionResult {
  command: string;
  args: string[];
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

export interface CommandExecutorOptions {
  cwd?: string;
  timeoutMs?: number;
}

export interface CommandExecutor {
  run(
    command: string,
    args?: string[],
    options?: CommandExecutorOptions,
  ): Promise<CommandExecutionResult>;
}

/**
 * Minimal shell wrapper used only for documented validation hooks. This class
 * keeps execution semantics narrow (no streaming, no env mutation) so the
 * deployment engine remains predictable and easy to reason about.
 */
export class ShellCommandExecutor implements CommandExecutor {
  async run(
    command: string,
    args: string[] = [],
    options: CommandExecutorOptions = {},
  ): Promise<CommandExecutionResult> {
    const { cwd, timeoutMs } = options;
    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        cwd,
        timeout: timeoutMs,
      });

      return {
        command,
        args,
        success: true,
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        code: 0,
      };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; code?: number };
      return {
        command,
        args,
        success: false,
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? '',
        code: execError.code ?? 1,
      };
    }
  }
}

export interface ValidationHook {
  command: string;
  args?: string[];
  cwd?: string;
  required?: boolean;
  timeoutMs?: number;
}

export interface AgentRelease {
  flagKey: string;
  version: string;
  artifactPath: string;
  targetEnvironment: string;
  rolloutPlan?: Partial<RolloutPlan>;
  metadata?: Record<string, string>;
}

export interface DeploymentGuardrails {
  preDeploy: ValidationHook[];
  postDeploy?: ValidationHook[];
  requiredHealthChecks?: string[];
}

export interface ValidationReport {
  success: boolean;
  results: CommandExecutionResult[];
}

export interface DeploymentMetricsSnapshot {
  validations: {
    passed: number;
    failed: number;
  };
  deployments: {
    requested: number;
    completed: number;
    failed: number;
    rolledBack: number;
  };
}

export class DeploymentMetricsCollector {
  private registry: PrometheusRegistry;
  private validationCounter: Counter<string>;
  private deploymentCounter: Counter<string>;
  private rolloutDuration: Histogram<string>;
  private validationStats = { passed: 0, failed: 0 };
  private deploymentStats = {
    requested: 0,
    completed: 0,
    failed: 0,
    rolledBack: 0,
  };

  constructor() {
    this.registry = new PrometheusRegistry();
    this.validationCounter = new Counter({
      name: 'evoforge_validation_total',
      help: 'Validation outcomes for agent releases',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.deploymentCounter = new Counter({
      name: 'evoforge_deployment_total',
      help: 'Deployment status counts for EvoForge',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.rolloutDuration = new Histogram({
      name: 'evoforge_rollout_duration_seconds',
      help: 'Observed rollout durations per deployment',
      labelNames: ['environment'],
      buckets: [30, 60, 120, 300, 600, 1200],
      registers: [this.registry],
    });
  }

  recordValidation(success: boolean): void {
    this.validationCounter.inc({ status: success ? 'passed' : 'failed' });
    if (success) {
      this.validationStats.passed += 1;
    } else {
      this.validationStats.failed += 1;
    }
  }

  recordDeployment(status: 'requested' | 'completed' | 'failed' | 'rolled_back'): void {
    this.deploymentCounter.inc({ status });
    switch (status) {
      case 'requested':
        this.deploymentStats.requested += 1;
        break;
      case 'completed':
        this.deploymentStats.completed += 1;
        break;
      case 'failed':
        this.deploymentStats.failed += 1;
        break;
      case 'rolled_back':
        this.deploymentStats.rolledBack += 1;
        break;
      default:
        break;
    }
  }

  observeRollout(environment: string, durationSeconds: number): void {
    this.rolloutDuration.observe({ environment }, durationSeconds);
  }

  async getSnapshot(): Promise<DeploymentMetricsSnapshot> {
    return {
      validations: { ...this.validationStats },
      deployments: { ...this.deploymentStats },
    };
  }

  async exportMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

export class EvoForgeDeploymentEngine {
  private pipeline: FeatureDeploymentPipeline;
  private pipelineId?: string;
  private createdPipeline?: DeploymentPipeline;
  private metrics: DeploymentMetricsCollector;
  private executor: CommandExecutor;

  constructor(
    private flagManager: FeatureFlagManager,
    options: {
      pipeline?: FeatureDeploymentPipeline;
      metricsCollector?: DeploymentMetricsCollector;
      executor?: CommandExecutor;
    } = {},
  ) {
    this.pipeline =
      options.pipeline ||
      new FeatureDeploymentPipeline(this.flagManager, {
        defaultTimeout: 20,
        maxRetries: 2,
        healthCheckInterval: 1,
        enableParallelDeployments: false,
        notificationSettings: {
          enableSlack: true,
          enableEmail: true,
          enablePagerDuty: true,
        },
      });

    this.metrics = options.metricsCollector || new DeploymentMetricsCollector();
    this.executor = options.executor || new ShellCommandExecutor();
  }

  async bootstrap(): Promise<DeploymentPipeline> {
    if (this.createdPipeline) {
      return this.createdPipeline;
    }

    const pipelineConfig = this.buildDefaultPipelineConfig();
    const pipeline = await this.pipeline.createPipeline(pipelineConfig);
    this.pipelineId = pipeline.id;
    this.createdPipeline = pipeline;
    return pipeline;
  }

  async deployAgentRelease(
    release: AgentRelease,
    guardrails: DeploymentGuardrails,
  ): Promise<DeploymentRequest> {
    await this.bootstrap();

    const validationReport = await this.validateRelease(guardrails.preDeploy);
    this.metrics.recordValidation(validationReport.success);
    if (!validationReport.success) {
      throw new Error('Pre-deployment validation failed');
    }

    const rolloutPlan = release.rolloutPlan || this.buildDefaultRolloutPlan(guardrails);
    try {
      const request = await this.pipeline.requestDeployment(
        release.flagKey,
        release.targetEnvironment,
        'evoforge',
        rolloutPlan,
      );

      this.metrics.recordDeployment('requested');
      return request;
    } catch (error) {
      this.metrics.recordDeployment('failed');
      throw error;
    }
  }

  async postDeploymentValidation(hooks: ValidationHook[]): Promise<ValidationReport> {
    const report = await this.validateRelease(hooks);
    this.metrics.recordValidation(report.success);
    return report;
  }

  async rollbackDeployment(requestId: string, reason: string): Promise<void> {
    await this.pipeline.triggerRollback(requestId, reason);
    this.metrics.recordDeployment('rolled_back');
  }

  async trackDeploymentCompletion(
    request: DeploymentRequest,
    durationMs: number,
  ): Promise<void> {
    this.metrics.recordDeployment('completed');
    this.metrics.observeRollout(request.targetEnvironment, durationMs / 1000);
  }

  async recordDeploymentFailure(): Promise<void> {
    this.metrics.recordDeployment('failed');
  }

  async getMetrics(): Promise<DeploymentMetricsSnapshot> {
    return this.metrics.getSnapshot();
  }

  private buildDefaultPipelineConfig(): Omit<DeploymentPipeline, 'id'> {
    const sharedHealthChecks: HealthCheck[] = [
      {
        name: 'api-health',
        type: 'http',
        endpoint: 'http://localhost:4000/health',
        expectedStatus: 200,
        timeout: 5,
        retries: 2,
        interval: 1,
      },
      {
        name: 'worker-heartbeat',
        type: 'metric',
        timeout: 5,
        retries: 1,
        interval: 1,
        metricQuery: {
          system: 'prometheus',
          query: 'sum(rate(agent_heartbeat_total[5m]))',
          threshold: 1,
          operator: 'gt',
        },
      },
    ];

    const environments: DeploymentEnvironment[] = [
      {
        name: 'staging',
        type: 'staging',
        promotionRules: [
          {
            id: 'staging-to-canary',
            name: 'Promote to canary when smoke tests pass',
            fromEnvironment: 'staging',
            toEnvironment: 'canary',
            automaticExecution: true,
            conditions: [
              { type: 'test_results', parameters: { suite: 'smoke' }, required: true },
              { type: 'metric_threshold', parameters: { errorRate: '<1%' }, required: true },
            ],
          },
        ],
        approvalRequired: false,
        approvers: [],
        automaticPromotion: true,
        rollbackOnFailure: true,
        healthChecks: sharedHealthChecks,
        loadBalancer: {
          endpoint: 'http://localhost:8080',
          trafficSplitCapable: true,
        },
      },
      {
        name: 'canary',
        type: 'canary',
        promotionRules: [
          {
            id: 'canary-to-production',
            name: 'Promote to production after stability window',
            fromEnvironment: 'canary',
            toEnvironment: 'production',
            automaticExecution: true,
            scheduleWindow: {
              startTime: '09:00',
              endTime: '17:00',
              daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              timezone: 'UTC',
            },
            conditions: [
              { type: 'metric_threshold', parameters: { latencyP95: '<400ms' }, required: true },
              { type: 'health_check', parameters: { name: 'api-health' }, required: true },
            ],
          },
        ],
        approvalRequired: true,
        approvers: ['sre@summit.ai', 'lead@summit.ai'],
        automaticPromotion: true,
        rollbackOnFailure: true,
        healthChecks: sharedHealthChecks,
        loadBalancer: {
          endpoint: 'http://localhost:8080',
          trafficSplitCapable: true,
        },
      },
      {
        name: 'production',
        type: 'production',
        promotionRules: [],
        approvalRequired: true,
        approvers: ['change-advisory@summit.ai'],
        automaticPromotion: false,
        rollbackOnFailure: true,
        healthChecks: sharedHealthChecks,
        loadBalancer: {
          endpoint: 'http://localhost:8080',
          trafficSplitCapable: true,
        },
      },
    ];

    return {
      name: 'EvoForge Agent Delivery',
      description:
        'Staged rollout pipeline for EvoForge agent releases with health checks and automated testing hooks.',
      environments,
      globalSettings: {
        rollbackStrategy: 'gradual',
        notificationChannels: ['slack', 'email', 'pagerduty'],
        maxConcurrentDeployments: 1,
        deploymentTimeout: 30,
      },
      integrations: {
        ci: {
          provider: 'github_actions',
          webhookUrl: 'https://example.com/ci-webhook',
          repository: 'summit/intelgraph',
          buildTriggers: {
            onFlagCreate: true,
            onFlagUpdate: true,
            onRolloutStart: true,
            onRolloutComplete: true,
          },
        },
        monitoring: {
          provider: 'prometheus',
          endpoint: 'http://localhost:9090',
          dashboards: ['EvoForge Rollout'],
          alerts: [
            {
              name: 'High error rate',
              condition: 'error_rate > 1%',
              severity: 'high',
              channels: ['pagerduty'],
            },
          ],
        },
        messaging: {
          slack: {
            webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXX',
            channel: '#evoforge-deployments',
            mentions: ['@oncall'],
          },
        },
      },
    };
  }

  private buildDefaultRolloutPlan(guardrails: DeploymentGuardrails): RolloutPlan {
    return {
      strategy: 'canary',
      phases: [
        {
          id: 'phase-1',
          name: '10% canary',
          percentage: 10,
          duration: 5,
          healthChecks: guardrails.requiredHealthChecks || ['api-health'],
          conditions: [
            { type: 'health_check', parameters: { name: 'api-health' } },
          ],
          autoPromotion: true,
          rollbackTriggers: [
            { type: 'error_rate', threshold: 1, window: 5, autoExecute: true },
          ],
        },
        {
          id: 'phase-2',
          name: '50% ramp',
          percentage: 50,
          duration: 10,
          healthChecks: guardrails.requiredHealthChecks || ['api-health'],
          conditions: [
            { type: 'metric', parameters: { latencyP95: '<450ms' } },
          ],
          autoPromotion: true,
          rollbackTriggers: [
            { type: 'error_rate', threshold: 1, window: 5, autoExecute: true },
            { type: 'response_time', threshold: 450, window: 5, autoExecute: true },
          ],
        },
        {
          id: 'phase-3',
          name: '100% rollout',
          percentage: 100,
          duration: 0,
          healthChecks: guardrails.requiredHealthChecks || ['api-health'],
          conditions: [
            { type: 'manual_approval', parameters: { approver: 'change-advisory' } },
          ],
          autoPromotion: false,
          rollbackTriggers: [
            { type: 'health_check', threshold: 1, window: 5, autoExecute: true },
          ],
        },
      ],
      // The rollback plan and traffic split remain intentionally conservative to
      // document a sane default without constraining consumers; callers can
      // supply stricter or looser plans through the rolloutPlan override.
      rollbackPlan: {
        strategy: 'gradual',
        targetState: 'previous_version',
        notificationDelay: 5,
        postRollbackActions: [
          'notify slack',
          'restore traffic split to 0%',
          'enable freeze window',
        ],
      },
      trafficSplitting: {
        enabled: true,
        initialPercentage: 10,
        incrementPercentage: 10,
        maxPercentage: 100,
        duration: 5,
      },
    };
  }

  private async validateRelease(hooks: ValidationHook[]): Promise<ValidationReport> {
    const results: CommandExecutionResult[] = [];
    for (const hook of hooks) {
      const result = await this.executor.run(hook.command, hook.args || [], {
        cwd: hook.cwd,
        timeoutMs: hook.timeoutMs,
      });
      results.push(result);
      if (!result.success && hook.required !== false) {
        return { success: false, results };
      }
    }

    return { success: true, results };
  }
}
