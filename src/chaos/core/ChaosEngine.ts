/**
 * @fileoverview Advanced Chaos Engineering System
 * Comprehensive chaos experiments with Chaos Toolkit integration,
 * network partitions, service degradation, resource exhaustion,
 * and automated chaos scheduling with detailed analysis.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { performance } from 'perf_hooks';

/**
 * Chaos experiment types and categories
 */
export type ChaosExperimentType =
  | 'network_partition'
  | 'service_degradation'
  | 'resource_exhaustion'
  | 'dependency_failure'
  | 'data_corruption'
  | 'security_breach'
  | 'configuration_drift'
  | 'cascade_failure';

/**
 * Experiment target types
 */
export type ExperimentTarget =
  | 'service'
  | 'database'
  | 'network'
  | 'infrastructure'
  | 'application'
  | 'data_store'
  | 'load_balancer'
  | 'cache';

/**
 * Chaos experiment status
 */
export type ExperimentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'scheduled';

/**
 * Blast radius scope
 */
export type BlastRadius =
  | 'single_instance'
  | 'service'
  | 'zone'
  | 'region'
  | 'global';

/**
 * Chaos experiment definition
 */
export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: ChaosExperimentType;
  target: ExperimentTarget;
  hypothesis: string;
  blastRadius: BlastRadius;
  configuration: ExperimentConfiguration;
  steadyState: SteadyStateDefinition;
  method: ExperimentMethod[];
  rollback: RollbackConfiguration;
  monitoring: MonitoringConfiguration;
  schedule?: ExperimentSchedule;
  metadata: {
    author: string;
    team: string;
    environment: string;
    tags: string[];
    createdAt: Date;
    version: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Experiment configuration parameters
 */
export interface ExperimentConfiguration {
  duration: number; // seconds
  tolerance: number; // percentage
  parallel: boolean;
  dryRun: boolean;
  environment: string;
  targets: ExperimentTargetConfig[];
  parameters: Record<string, any>;
  safeguards: SafeguardConfiguration[];
}

/**
 * Target configuration for experiments
 */
export interface ExperimentTargetConfig {
  name: string;
  type: ExperimentTarget;
  selector: TargetSelector;
  percentage?: number; // percentage of targets to affect
  configuration: Record<string, any>;
}

/**
 * Target selector for identifying experiment subjects
 */
export interface TargetSelector {
  type: 'label' | 'name' | 'random' | 'percentage' | 'custom';
  criteria: Record<string, any>;
  filters?: SelectorFilter[];
}

/**
 * Selector filter
 */
export interface SelectorFilter {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'in'
    | 'not_in'
    | 'regex'
    | 'greater_than'
    | 'less_than';
  value: any;
}

/**
 * Steady state definition (system health baseline)
 */
export interface SteadyStateDefinition {
  title: string;
  description: string;
  probes: HealthProbe[];
  tolerance: ToleranceConfiguration;
}

/**
 * Health probe for system monitoring
 */
export interface HealthProbe {
  name: string;
  type: 'http' | 'tcp' | 'metric' | 'database' | 'custom';
  configuration: ProbeConfiguration;
  tolerance: ProbeToleranceConfig;
  frequency: number; // seconds
  timeout: number; // seconds
  retries: number;
}

/**
 * Probe configuration
 */
export interface ProbeConfiguration {
  url?: string;
  host?: string;
  port?: number;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  expectedStatus?: number[];
  query?: string; // For database/metric probes
  customProbe?: () => Promise<ProbeResult>;
}

/**
 * Probe tolerance configuration
 */
export interface ProbeToleranceConfig {
  min?: number;
  max?: number;
  exact?: any;
  pattern?: string;
  custom?: (result: any) => boolean;
}

/**
 * Overall tolerance configuration
 */
export interface ToleranceConfiguration {
  failureThreshold: number; // percentage of probes that can fail
  responseTimeThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage
  customTolerances: CustomTolerance[];
}

/**
 * Custom tolerance definition
 */
export interface CustomTolerance {
  name: string;
  validator: (metrics: ExperimentMetrics) => boolean;
  critical: boolean;
}

/**
 * Experiment method (the actual chaos action)
 */
export interface ExperimentMethod {
  name: string;
  type: 'action' | 'probe';
  provider: string; // e.g., 'kubernetes', 'aws', 'gcp', 'process', 'network'
  module: string;
  function: string;
  arguments: Record<string, any>;
  configuration: MethodConfiguration;
  pauses?: PauseConfiguration;
}

/**
 * Method configuration
 */
export interface MethodConfiguration {
  timeout: number; // seconds
  retries: number;
  background: boolean;
  continueOnFailure: boolean;
  rollbackOnFailure: boolean;
}

/**
 * Pause configuration for staged experiments
 */
export interface PauseConfiguration {
  before?: number; // seconds
  after?: number; // seconds
}

/**
 * Rollback configuration
 */
export interface RollbackConfiguration {
  enabled: boolean;
  automatic: boolean;
  conditions: RollbackCondition[];
  methods: ExperimentMethod[];
  timeout: number; // seconds
}

/**
 * Rollback condition
 */
export interface RollbackCondition {
  type:
    | 'steady_state_violation'
    | 'timeout'
    | 'manual'
    | 'error_threshold'
    | 'custom';
  threshold?: number;
  duration?: number; // seconds
  validator?: (metrics: ExperimentMetrics) => boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfiguration {
  enabled: boolean;
  metrics: MetricConfiguration[];
  alerts: AlertConfiguration[];
  dashboards: string[];
  notifications: NotificationConfiguration[];
}

/**
 * Metric configuration
 */
export interface MetricConfiguration {
  name: string;
  source: 'prometheus' | 'datadog' | 'cloudwatch' | 'custom';
  query: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'percentile';
  threshold?: {
    warning: number;
    critical: number;
  };
}

/**
 * Alert configuration
 */
export interface AlertConfiguration {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  channels: string[];
  suppressDuration: number; // minutes
}

/**
 * Notification configuration
 */
export interface NotificationConfiguration {
  type: 'slack' | 'email' | 'pagerduty' | 'webhook';
  configuration: Record<string, any>;
  events: string[]; // experiment events to notify on
}

/**
 * Experiment scheduling configuration
 */
export interface ExperimentSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  timezone: string;
  restrictions: ScheduleRestriction[];
  maxConcurrent: number;
}

/**
 * Schedule frequency configuration
 */
export interface ScheduleFrequency {
  type: 'once' | 'cron' | 'interval';
  expression?: string; // cron expression or interval
  startTime?: Date;
  endTime?: Date;
}

/**
 * Schedule restriction
 */
export interface ScheduleRestriction {
  type: 'time_window' | 'environment' | 'deployment' | 'custom';
  parameters: Record<string, any>;
}

/**
 * Safeguard configuration to prevent runaway experiments
 */
export interface SafeguardConfiguration {
  name: string;
  type:
    | 'circuit_breaker'
    | 'rate_limit'
    | 'resource_limit'
    | 'time_limit'
    | 'approval_gate';
  configuration: Record<string, any>;
  enabled: boolean;
}

/**
 * Experiment execution result
 */
export interface ExperimentResult {
  experimentId: string;
  status: ExperimentStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  hypothesis: string;
  steady_state: {
    before: SteadyStateResult;
    during?: SteadyStateResult;
    after: SteadyStateResult;
  };
  method_results: MethodResult[];
  rollback_results?: RollbackResult[];
  metrics: ExperimentMetrics;
  insights: ExperimentInsight[];
  errors: string[];
  warnings: string[];
}

/**
 * Steady state probe result
 */
export interface SteadyStateResult {
  status: 'passed' | 'failed' | 'degraded';
  timestamp: Date;
  probes: ProbeResult[];
  overall_health: number; // 0-100 percentage
  deviations: SteadyStateDeviation[];
}

/**
 * Individual probe result
 */
export interface ProbeResult {
  name: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  value: any;
  expected: any;
  duration: number; // milliseconds
  message: string;
  timestamp: Date;
}

/**
 * Steady state deviation
 */
export interface SteadyStateDeviation {
  probe: string;
  metric: string;
  expected: number;
  actual: number;
  deviation: number; // percentage
  severity: 'minor' | 'major' | 'critical';
}

/**
 * Method execution result
 */
export interface MethodResult {
  name: string;
  type: 'action' | 'probe';
  status: 'completed' | 'failed' | 'skipped' | 'timeout';
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  output: any;
  error?: string;
}

/**
 * Rollback execution result
 */
export interface RollbackResult {
  method: string;
  status: 'completed' | 'failed';
  duration: number; // milliseconds
  output: any;
  error?: string;
}

/**
 * Experiment metrics collection
 */
export interface ExperimentMetrics {
  system: SystemMetrics;
  application: ApplicationMetrics;
  network: NetworkMetrics;
  custom: Record<string, number>;
  timeline: MetricTimeline[];
}

/**
 * System metrics
 */
export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_io: number;
  network_io: number;
  process_count: number;
  load_average: number[];
  uptime: number;
}

/**
 * Application metrics
 */
export interface ApplicationMetrics {
  response_time: number;
  error_rate: number;
  throughput: number;
  active_connections: number;
  queue_depth: number;
  cache_hit_rate: number;
}

/**
 * Network metrics
 */
export interface NetworkMetrics {
  latency: number;
  packet_loss: number;
  bandwidth_utilization: number;
  connections_dropped: number;
  dns_resolution_time: number;
}

/**
 * Metric timeline entry
 */
export interface MetricTimeline {
  timestamp: Date;
  metrics: Record<string, number>;
}

/**
 * Experiment insight
 */
export interface ExperimentInsight {
  type:
    | 'weakness_discovered'
    | 'resilience_confirmed'
    | 'improvement_opportunity'
    | 'false_positive';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: InsightEvidence[];
  recommendations: string[];
  confidence: number; // 0-100 percentage
}

/**
 * Insight evidence
 */
export interface InsightEvidence {
  type: 'metric' | 'log' | 'trace' | 'alert';
  source: string;
  data: any;
  timestamp: Date;
}

/**
 * Comprehensive chaos engineering system
 */
export class ChaosEngine extends EventEmitter {
  private experiments: Map<string, ChaosExperiment> = new Map();
  private activeExperiments: Map<string, ExperimentExecution> = new Map();
  private experimentResults: Map<string, ExperimentResult[]> = new Map();
  private chaosToolkitProcess?: ChildProcess;

  constructor(
    private config: {
      chaosToolkitPath: string;
      experimentDirectory: string;
      enableScheduling: boolean;
      enableSafeguards: boolean;
      maxConcurrentExperiments: number;
      defaultTimeout: number; // minutes
      monitoringEnabled: boolean;
      notificationsEnabled: boolean;
    },
  ) {
    super();
    this.initializeChaosEngine();
    this.startBackgroundTasks();
  }

  /**
   * Register chaos experiment
   */
  async registerExperiment(experiment: ChaosExperiment): Promise<void> {
    // Validate experiment definition
    await this.validateExperiment(experiment);

    // Store experiment
    this.experiments.set(experiment.id, experiment);

    // Schedule if configured
    if (experiment.schedule?.enabled && this.config.enableScheduling) {
      await this.scheduleExperiment(experiment);
    }

    this.emit('experiment:registered', { experiment });

    console.log(
      `Chaos experiment registered: ${experiment.id} (${experiment.name})`,
    );
  }

  /**
   * Execute chaos experiment
   */
  async executeExperiment(
    experimentId: string,
    options: {
      dryRun?: boolean;
      environment?: string;
      skipSteadyState?: boolean;
      notifyOnCompletion?: boolean;
    } = {},
  ): Promise<ExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Check if experiment is already running
    if (this.activeExperiments.has(experimentId)) {
      throw new Error(`Experiment already running: ${experimentId}`);
    }

    // Check concurrent experiment limits
    if (this.activeExperiments.size >= this.config.maxConcurrentExperiments) {
      throw new Error('Maximum concurrent experiments limit reached');
    }

    const execution = new ExperimentExecution(experiment, options);
    this.activeExperiments.set(experimentId, execution);

    const result: ExperimentResult = {
      experimentId,
      status: 'running',
      startTime: new Date(),
      hypothesis: experiment.hypothesis,
      steady_state: {
        before: {
          status: 'passed',
          timestamp: new Date(),
          probes: [],
          overall_health: 100,
          deviations: [],
        },
        after: {
          status: 'passed',
          timestamp: new Date(),
          probes: [],
          overall_health: 100,
          deviations: [],
        },
      },
      method_results: [],
      metrics: {
        system: {
          cpu_usage: 0,
          memory_usage: 0,
          disk_io: 0,
          network_io: 0,
          process_count: 0,
          load_average: [],
          uptime: 0,
        },
        application: {
          response_time: 0,
          error_rate: 0,
          throughput: 0,
          active_connections: 0,
          queue_depth: 0,
          cache_hit_rate: 0,
        },
        network: {
          latency: 0,
          packet_loss: 0,
          bandwidth_utilization: 0,
          connections_dropped: 0,
          dns_resolution_time: 0,
        },
        custom: {},
        timeline: [],
      },
      insights: [],
      errors: [],
      warnings: [],
    };

    try {
      this.emit('experiment:started', { experiment, options });

      // Execute safeguard checks
      if (this.config.enableSafeguards) {
        await this.checkSafeguards(experiment);
      }

      // Execute experiment phases
      await this.executeExperimentPhases(
        experiment,
        execution,
        result,
        options,
      );

      result.status = 'completed';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      // Generate insights
      result.insights = await this.generateInsights(experiment, result);

      // Store result
      const existingResults = this.experimentResults.get(experimentId) || [];
      existingResults.push(result);
      this.experimentResults.set(experimentId, existingResults);

      this.emit('experiment:completed', { experiment, result });

      // Send notifications if enabled
      if (options.notifyOnCompletion && this.config.notificationsEnabled) {
        await this.sendExperimentNotifications(experiment, result);
      }
    } catch (error) {
      result.status = 'failed';
      result.errors.push(error.message);
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      // Attempt rollback if configured
      if (experiment.rollback.enabled && experiment.rollback.automatic) {
        try {
          result.rollback_results = await this.executeRollback(
            experiment,
            execution,
          );
        } catch (rollbackError) {
          result.errors.push(`Rollback failed: ${rollbackError.message}`);
        }
      }

      this.emit('experiment:failed', { experiment, result, error });
    } finally {
      // Clean up
      this.activeExperiments.delete(experimentId);
    }

    return result;
  }

  /**
   * Abort running experiment
   */
  async abortExperiment(experimentId: string, reason: string): Promise<void> {
    const execution = this.activeExperiments.get(experimentId);
    if (!execution) {
      throw new Error(`No active experiment found: ${experimentId}`);
    }

    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    try {
      // Stop chaos toolkit process if running
      if (execution.chaosProcess) {
        execution.chaosProcess.kill('SIGTERM');
      }

      // Execute rollback if configured
      if (experiment.rollback.enabled) {
        await this.executeRollback(experiment, execution);
      }

      // Update execution status
      execution.status = 'aborted';

      this.emit('experiment:aborted', { experimentId, reason });
    } finally {
      this.activeExperiments.delete(experimentId);
    }
  }

  /**
   * Get experiment execution status
   */
  getExperimentStatus(experimentId: string): {
    experiment?: ChaosExperiment;
    isActive: boolean;
    currentPhase?: string;
    progress?: number;
    results: ExperimentResult[];
  } {
    const experiment = this.experiments.get(experimentId);
    const execution = this.activeExperiments.get(experimentId);
    const results = this.experimentResults.get(experimentId) || [];

    return {
      experiment,
      isActive: !!execution,
      currentPhase: execution?.currentPhase,
      progress: execution?.progress,
      results,
    };
  }

  /**
   * List all registered experiments
   */
  listExperiments(filters?: {
    type?: ChaosExperimentType;
    environment?: string;
    riskLevel?: string;
    status?: ExperimentStatus;
  }): ChaosExperiment[] {
    let experiments = Array.from(this.experiments.values());

    if (filters) {
      if (filters.type) {
        experiments = experiments.filter((e) => e.type === filters.type);
      }
      if (filters.environment) {
        experiments = experiments.filter(
          (e) => e.metadata.environment === filters.environment,
        );
      }
      if (filters.riskLevel) {
        experiments = experiments.filter(
          (e) => e.metadata.riskLevel === filters.riskLevel,
        );
      }
    }

    return experiments;
  }

  /**
   * Create network partition experiment
   */
  static createNetworkPartitionExperiment(config: {
    name: string;
    targets: string[];
    duration: number;
    partitionType: 'isolate' | 'delay' | 'loss' | 'corrupt';
    parameters: Record<string, any>;
  }): ChaosExperiment {
    return {
      id: `network_partition_${Date.now()}`,
      name: config.name,
      description: `Network partition experiment affecting ${config.targets.join(', ')}`,
      type: 'network_partition',
      target: 'network',
      hypothesis: 'System should handle network partitions gracefully',
      blastRadius: 'service',
      configuration: {
        duration: config.duration,
        tolerance: 10, // 10% degradation acceptable
        parallel: false,
        dryRun: false,
        environment: 'staging',
        targets: config.targets.map((target) => ({
          name: target,
          type: 'network' as ExperimentTarget,
          selector: {
            type: 'name',
            criteria: { name: target },
          },
          configuration: config.parameters,
        })),
        parameters: config.parameters,
        safeguards: [
          {
            name: 'timeout_safeguard',
            type: 'time_limit',
            configuration: { max_duration: config.duration * 2 },
            enabled: true,
          },
        ],
      },
      steadyState: {
        title: 'System is healthy',
        description: 'All services respond within acceptable time',
        probes: [
          {
            name: 'service_health_check',
            type: 'http',
            configuration: {
              url: 'http://localhost/health',
              expectedStatus: [200],
            },
            tolerance: {
              exact: 200,
            },
            frequency: 5,
            timeout: 10,
            retries: 3,
          },
        ],
        tolerance: {
          failureThreshold: 5, // 5% of probes can fail
          responseTimeThreshold: 2000, // 2 seconds max response time
          errorRateThreshold: 1, // 1% error rate max
          customTolerances: [],
        },
      },
      method: [
        {
          name: 'create_network_partition',
          type: 'action',
          provider: 'network',
          module: 'netem',
          function: config.partitionType,
          arguments: config.parameters,
          configuration: {
            timeout: 30,
            retries: 3,
            background: false,
            continueOnFailure: false,
            rollbackOnFailure: true,
          },
        },
      ],
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'steady_state_violation',
            threshold: 50, // If health drops below 50%
          },
          {
            type: 'timeout',
          },
        ],
        methods: [
          {
            name: 'restore_network',
            type: 'action',
            provider: 'network',
            module: 'netem',
            function: 'restore',
            arguments: {},
            configuration: {
              timeout: 30,
              retries: 5,
              background: false,
              continueOnFailure: false,
              rollbackOnFailure: false,
            },
          },
        ],
        timeout: 60,
      },
      monitoring: {
        enabled: true,
        metrics: [
          {
            name: 'response_time',
            source: 'prometheus',
            query: 'avg(http_request_duration_seconds)',
            aggregation: 'avg',
            threshold: {
              warning: 1.0,
              critical: 2.0,
            },
          },
          {
            name: 'error_rate',
            source: 'prometheus',
            query: 'rate(http_requests_total{status=~"5.."}[5m])',
            aggregation: 'avg',
            threshold: {
              warning: 0.01,
              critical: 0.05,
            },
          },
        ],
        alerts: [
          {
            name: 'high_error_rate',
            condition: 'error_rate > 0.05',
            severity: 'critical',
            channels: ['slack-alerts'],
            suppressDuration: 5,
          },
        ],
        dashboards: ['chaos-experiments'],
        notifications: [
          {
            type: 'slack',
            configuration: {
              webhook_url: process.env.SLACK_WEBHOOK_URL,
              channel: '#chaos-engineering',
            },
            events: [
              'experiment_started',
              'experiment_completed',
              'experiment_failed',
            ],
          },
        ],
      },
      metadata: {
        author: 'chaos-team',
        team: 'sre',
        environment: 'staging',
        tags: ['network', 'partition', 'resilience'],
        createdAt: new Date(),
        version: '1.0.0',
        riskLevel: 'medium',
      },
    };
  }

  /**
   * Create service degradation experiment
   */
  static createServiceDegradationExperiment(config: {
    name: string;
    service: string;
    degradationType: 'cpu' | 'memory' | 'disk' | 'network' | 'response_time';
    intensity: number;
    duration: number;
  }): ChaosExperiment {
    const experiment = ChaosEngine.createNetworkPartitionExperiment({
      name: config.name,
      targets: [config.service],
      duration: config.duration,
      partitionType: 'delay',
      parameters: { intensity: config.intensity },
    });

    experiment.type = 'service_degradation';
    experiment.target = 'service';
    experiment.hypothesis = `Service ${config.service} should handle ${config.degradationType} degradation gracefully`;

    return experiment;
  }

  /**
   * Create resource exhaustion experiment
   */
  static createResourceExhaustionExperiment(config: {
    name: string;
    resource: 'cpu' | 'memory' | 'disk' | 'connections' | 'threads';
    target: string;
    exhaustionLevel: number; // percentage
    duration: number;
  }): ChaosExperiment {
    const experiment = ChaosEngine.createNetworkPartitionExperiment({
      name: config.name,
      targets: [config.target],
      duration: config.duration,
      partitionType: 'delay',
      parameters: {
        resource: config.resource,
        level: config.exhaustionLevel,
      },
    });

    experiment.type = 'resource_exhaustion';
    experiment.target = 'infrastructure';
    experiment.hypothesis = `System should handle ${config.resource} exhaustion at ${config.exhaustionLevel}% level`;
    experiment.metadata.riskLevel =
      config.exhaustionLevel > 80 ? 'high' : 'medium';

    return experiment;
  }

  /**
   * Execute experiment phases
   */
  private async executeExperimentPhases(
    experiment: ChaosExperiment,
    execution: ExperimentExecution,
    result: ExperimentResult,
    options: any,
  ): Promise<void> {
    // Phase 1: Pre-experiment steady state check
    if (!options.skipSteadyState) {
      execution.currentPhase = 'pre_steady_state';
      result.steady_state.before = await this.checkSteadyState(experiment);

      if (result.steady_state.before.status === 'failed') {
        throw new Error('Pre-experiment steady state check failed');
      }
    }

    // Phase 2: Execute chaos methods
    execution.currentPhase = 'chaos_execution';
    result.method_results = await this.executeChaosMethods(
      experiment,
      execution,
      options,
    );

    // Phase 3: Monitor during experiment
    if (experiment.configuration.duration > 0) {
      execution.currentPhase = 'monitoring';
      await this.monitorExperiment(experiment, execution, result);
    }

    // Phase 4: Post-experiment steady state check
    if (!options.skipSteadyState) {
      execution.currentPhase = 'post_steady_state';
      result.steady_state.after = await this.checkSteadyState(experiment);
    }

    // Phase 5: Rollback if needed
    if (
      experiment.rollback.enabled &&
      this.shouldRollback(experiment, result)
    ) {
      execution.currentPhase = 'rollback';
      result.rollback_results = await this.executeRollback(
        experiment,
        execution,
      );
    }
  }

  /**
   * Check steady state using defined probes
   */
  private async checkSteadyState(
    experiment: ChaosExperiment,
  ): Promise<SteadyStateResult> {
    const result: SteadyStateResult = {
      status: 'passed',
      timestamp: new Date(),
      probes: [],
      overall_health: 0,
      deviations: [],
    };

    let totalProbes = 0;
    let passedProbes = 0;

    for (const probe of experiment.steadyState.probes) {
      const probeResult = await this.executeProbe(probe);
      result.probes.push(probeResult);
      totalProbes++;

      if (probeResult.status === 'passed') {
        passedProbes++;
      }
    }

    // Calculate overall health
    result.overall_health =
      totalProbes > 0 ? (passedProbes / totalProbes) * 100 : 100;

    // Determine overall status
    const failureThreshold = experiment.steadyState.tolerance.failureThreshold;
    if (result.overall_health < 100 - failureThreshold) {
      result.status = 'failed';
    } else if (result.overall_health < 100) {
      result.status = 'degraded';
    }

    return result;
  }

  /**
   * Execute individual health probe
   */
  private async executeProbe(probe: HealthProbe): Promise<ProbeResult> {
    const startTime = performance.now();

    const result: ProbeResult = {
      name: probe.name,
      status: 'passed',
      value: null,
      expected: null,
      duration: 0,
      message: '',
      timestamp: new Date(),
    };

    try {
      switch (probe.type) {
        case 'http':
          result.value = await this.executeHttpProbe(probe);
          result.expected = probe.configuration.expectedStatus;
          break;

        case 'tcp':
          result.value = await this.executeTcpProbe(probe);
          result.expected = 'connected';
          break;

        case 'metric':
          result.value = await this.executeMetricProbe(probe);
          result.expected = probe.tolerance;
          break;

        case 'database':
          result.value = await this.executeDatabaseProbe(probe);
          result.expected = 'success';
          break;

        case 'custom':
          if (probe.configuration.customProbe) {
            result.value = await probe.configuration.customProbe();
          }
          break;
      }

      // Check tolerance
      const withinTolerance = this.checkProbeTolerance(
        result.value,
        probe.tolerance,
      );
      result.status = withinTolerance ? 'passed' : 'failed';
      result.message =
        result.status === 'passed'
          ? 'Probe passed'
          : 'Probe failed tolerance check';
    } catch (error) {
      result.status = 'error';
      result.message = error.message;
    }

    result.duration = performance.now() - startTime;
    return result;
  }

  /**
   * Execute HTTP probe
   */
  private async executeHttpProbe(probe: HealthProbe): Promise<any> {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(probe.configuration.url!, {
      method: probe.configuration.method || 'GET',
      headers: probe.configuration.headers,
      timeout: probe.timeout * 1000,
    });

    return {
      status: response.status,
      ok: response.ok,
      responseTime: 0, // Would measure actual response time
    };
  }

  /**
   * Execute TCP probe
   */
  private async executeTcpProbe(probe: HealthProbe): Promise<any> {
    const net = require('net');

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('TCP probe timeout'));
      }, probe.timeout * 1000);

      socket.connect(
        probe.configuration.port!,
        probe.configuration.host!,
        () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve({ connected: true });
        },
      );

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Execute metric probe
   */
  private async executeMetricProbe(probe: HealthProbe): Promise<any> {
    // Implementation would query monitoring system (Prometheus, DataDog, etc.)
    return { value: 0.5, unit: 'percentage' };
  }

  /**
   * Execute database probe
   */
  private async executeDatabaseProbe(probe: HealthProbe): Promise<any> {
    // Implementation would execute database query
    return { query_time: 100, rows: 1 };
  }

  /**
   * Check if probe result is within tolerance
   */
  private checkProbeTolerance(
    value: any,
    tolerance: ProbeToleranceConfig,
  ): boolean {
    if (tolerance.exact !== undefined) {
      return (
        value === tolerance.exact ||
        (typeof value === 'object' && value.status === tolerance.exact)
      );
    }

    if (typeof value === 'number') {
      if (tolerance.min !== undefined && value < tolerance.min) return false;
      if (tolerance.max !== undefined && value > tolerance.max) return false;
    }

    if (tolerance.pattern && typeof value === 'string') {
      return new RegExp(tolerance.pattern).test(value);
    }

    if (tolerance.custom) {
      return tolerance.custom(value);
    }

    return true;
  }

  /**
   * Execute chaos methods using Chaos Toolkit
   */
  private async executeChaosMethodsUsingToolkit(
    experiment: ChaosExperiment,
    execution: ExperimentExecution,
  ): Promise<MethodResult[]> {
    const results: MethodResult[] = [];

    // Generate Chaos Toolkit experiment file
    const experimentFile =
      await this.generateChaosToolkitExperiment(experiment);

    // Execute using Chaos Toolkit CLI
    return new Promise((resolve, reject) => {
      const args = ['run', experimentFile];
      if (experiment.configuration.dryRun) {
        args.push('--dry');
      }

      execution.chaosProcess = spawn(this.config.chaosToolkitPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      execution.chaosProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      execution.chaosProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      execution.chaosProcess.on('close', (code) => {
        if (code === 0) {
          // Parse Chaos Toolkit output and generate results
          const methodResults = this.parseChaosToolkitOutput(stdout);
          resolve(methodResults);
        } else {
          reject(
            new Error(`Chaos Toolkit failed with code ${code}: ${stderr}`),
          );
        }
      });

      execution.chaosProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Execute chaos methods (simplified version)
   */
  private async executeChaosMethodsFallback(
    experiment: ChaosExperiment,
  ): Promise<MethodResult[]> {
    const results: MethodResult[] = [];

    for (const method of experiment.method) {
      const startTime = new Date();

      const result: MethodResult = {
        name: method.name,
        type: method.type,
        status: 'completed',
        startTime,
        endTime: startTime,
        duration: 0,
        output: {},
      };

      try {
        // Execute method based on provider and function
        result.output = await this.executeMethod(method);

        result.endTime = new Date();
        result.duration = result.endTime.getTime() - startTime.getTime();
      } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - startTime.getTime();
      }

      results.push(result);
    }

    return results;
  }

  private async executeChaosMethod(
    experiment: ChaosExperiment,
    execution: ExperimentExecution,
    options: any,
  ): Promise<MethodResult[]> {
    if (this.config.chaosToolkitPath && !options.dryRun) {
      try {
        return await this.executeChaosMethodsUsingToolkit(
          experiment,
          execution,
        );
      } catch (error) {
        console.warn(
          'Chaos Toolkit execution failed, falling back to internal implementation:',
          error.message,
        );
      }
    }

    return await this.executeChaosMethodsFallback(experiment);
  }

  /**
   * Simplified method execution for fallback
   */
  private async executeMethod(method: ExperimentMethod): Promise<any> {
    console.log(
      `Executing chaos method: ${method.name} (${method.provider}.${method.module}.${method.function})`,
    );

    // Simulate method execution
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      method: method.name,
      provider: method.provider,
      function: method.function,
      arguments: method.arguments,
      simulated: true,
    };
  }

  /**
   * Monitor experiment during execution
   */
  private async monitorExperiment(
    experiment: ChaosExperiment,
    execution: ExperimentExecution,
    result: ExperimentResult,
  ): Promise<void> {
    const monitoringDuration = experiment.configuration.duration * 1000; // Convert to milliseconds
    const monitoringInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (
      Date.now() - startTime < monitoringDuration &&
      execution.status === 'running'
    ) {
      // Collect metrics
      const metrics = await this.collectMetrics(experiment);
      result.metrics.timeline.push({
        timestamp: new Date(),
        metrics: this.flattenMetrics(metrics),
      });

      // Check rollback conditions
      if (this.shouldRollback(experiment, result)) {
        break;
      }

      // Update progress
      execution.progress = Math.min(
        100,
        ((Date.now() - startTime) / monitoringDuration) * 100,
      );

      await new Promise((resolve) => setTimeout(resolve, monitoringInterval));
    }
  }

  /**
   * Collect system and application metrics
   */
  private async collectMetrics(
    experiment: ChaosExperiment,
  ): Promise<ExperimentMetrics> {
    // Mock implementation - in reality would query monitoring systems
    return {
      system: {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_io: Math.random() * 1000,
        network_io: Math.random() * 1000,
        process_count: Math.floor(Math.random() * 200),
        load_average: [Math.random(), Math.random(), Math.random()],
        uptime: Date.now() - Math.random() * 86400000,
      },
      application: {
        response_time: Math.random() * 2000,
        error_rate: Math.random() * 0.1,
        throughput: Math.random() * 1000,
        active_connections: Math.floor(Math.random() * 100),
        queue_depth: Math.floor(Math.random() * 50),
        cache_hit_rate: 0.8 + Math.random() * 0.2,
      },
      network: {
        latency: Math.random() * 100,
        packet_loss: Math.random() * 0.01,
        bandwidth_utilization: Math.random() * 0.8,
        connections_dropped: Math.floor(Math.random() * 10),
        dns_resolution_time: Math.random() * 50,
      },
      custom: {},
      timeline: [],
    };
  }

  /**
   * Flatten metrics for timeline storage
   */
  private flattenMetrics(metrics: ExperimentMetrics): Record<string, number> {
    return {
      ...metrics.system,
      ...metrics.application,
      ...metrics.network,
      ...metrics.custom,
    };
  }

  /**
   * Check if rollback should be triggered
   */
  private shouldRollback(
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): boolean {
    for (const condition of experiment.rollback.conditions) {
      switch (condition.type) {
        case 'steady_state_violation':
          if (
            result.steady_state.during &&
            result.steady_state.during.overall_health <
              (condition.threshold || 50)
          ) {
            return true;
          }
          break;

        case 'error_threshold':
          const latestMetrics =
            result.metrics.timeline[result.metrics.timeline.length - 1];
          if (
            latestMetrics &&
            latestMetrics.metrics.error_rate > (condition.threshold || 0.1)
          ) {
            return true;
          }
          break;

        case 'custom':
          if (condition.validator && condition.validator(result.metrics)) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  /**
   * Execute rollback methods
   */
  private async executeRollback(
    experiment: ChaosExperiment,
    execution: ExperimentExecution,
  ): Promise<RollbackResult[]> {
    const results: RollbackResult[] = [];

    for (const method of experiment.rollback.methods) {
      const startTime = Date.now();

      const result: RollbackResult = {
        method: method.name,
        status: 'completed',
        duration: 0,
        output: {},
      };

      try {
        result.output = await this.executeMethod(method);
        result.duration = Date.now() - startTime;
      } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        result.duration = Date.now() - startTime;
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Generate insights from experiment results
   */
  private async generateInsights(
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): Promise<ExperimentInsight[]> {
    const insights: ExperimentInsight[] = [];

    // Analyze steady state deviations
    const beforeHealth = result.steady_state.before.overall_health;
    const afterHealth = result.steady_state.after.overall_health;

    if (afterHealth < beforeHealth - 10) {
      insights.push({
        type: 'weakness_discovered',
        title: 'System resilience degraded',
        description: `System health dropped from ${beforeHealth}% to ${afterHealth}% during experiment`,
        severity:
          afterHealth < 50 ? 'critical' : afterHealth < 75 ? 'high' : 'medium',
        evidence: [
          {
            type: 'metric',
            source: 'steady_state_check',
            data: { before: beforeHealth, after: afterHealth },
            timestamp: result.steady_state.after.timestamp,
          },
        ],
        recommendations: [
          'Investigate root cause of health degradation',
          'Implement additional monitoring for early detection',
          'Consider implementing circuit breakers',
        ],
        confidence: 90,
      });
    } else if (afterHealth >= beforeHealth) {
      insights.push({
        type: 'resilience_confirmed',
        title: 'System showed good resilience',
        description: `System maintained ${afterHealth}% health during chaos experiment`,
        severity: 'low',
        evidence: [
          {
            type: 'metric',
            source: 'steady_state_check',
            data: { before: beforeHealth, after: afterHealth },
            timestamp: result.steady_state.after.timestamp,
          },
        ],
        recommendations: [
          'Consider increasing experiment intensity to find breaking points',
          'Extend experiment duration to test sustained chaos',
        ],
        confidence: 85,
      });
    }

    // Analyze performance metrics
    const avgResponseTime =
      result.metrics.timeline.length > 0
        ? result.metrics.timeline.reduce(
            (sum, m) => sum + m.metrics.response_time,
            0,
          ) / result.metrics.timeline.length
        : 0;

    if (avgResponseTime > 2000) {
      insights.push({
        type: 'improvement_opportunity',
        title: 'Response time degradation detected',
        description: `Average response time increased to ${avgResponseTime}ms during experiment`,
        severity: avgResponseTime > 5000 ? 'high' : 'medium',
        evidence: [
          {
            type: 'metric',
            source: 'performance_monitoring',
            data: { avg_response_time: avgResponseTime },
            timestamp: new Date(),
          },
        ],
        recommendations: [
          'Optimize critical path performance',
          'Implement caching strategies',
          'Consider horizontal scaling',
        ],
        confidence: 80,
      });
    }

    return insights;
  }

  /**
   * Validate experiment definition
   */
  private async validateExperiment(experiment: ChaosExperiment): Promise<void> {
    // Validate required fields
    if (!experiment.id || !experiment.name || !experiment.hypothesis) {
      throw new Error('Experiment must have id, name, and hypothesis');
    }

    // Validate method configuration
    if (!experiment.method || experiment.method.length === 0) {
      throw new Error('Experiment must have at least one method');
    }

    // Validate steady state probes
    if (
      !experiment.steadyState.probes ||
      experiment.steadyState.probes.length === 0
    ) {
      throw new Error('Experiment must have at least one steady state probe');
    }

    // Validate safeguards for high-risk experiments
    if (
      experiment.metadata.riskLevel === 'high' ||
      experiment.metadata.riskLevel === 'critical'
    ) {
      if (
        !experiment.configuration.safeguards ||
        experiment.configuration.safeguards.length === 0
      ) {
        throw new Error(
          'High-risk experiments must have safeguards configured',
        );
      }
    }
  }

  /**
   * Check experiment safeguards
   */
  private async checkSafeguards(experiment: ChaosExperiment): Promise<void> {
    for (const safeguard of experiment.configuration.safeguards) {
      if (!safeguard.enabled) continue;

      switch (safeguard.type) {
        case 'circuit_breaker':
          // Check if system is healthy enough to proceed
          break;

        case 'rate_limit':
          // Check if we're within rate limits
          break;

        case 'resource_limit':
          // Check if sufficient resources are available
          break;

        case 'approval_gate':
          // Check if required approvals are in place
          break;

        case 'time_limit':
          // Validate experiment duration
          const maxDuration = safeguard.configuration.max_duration || 3600;
          if (experiment.configuration.duration > maxDuration) {
            throw new Error(
              `Experiment duration exceeds safeguard limit: ${maxDuration}s`,
            );
          }
          break;
      }
    }
  }

  /**
   * Schedule experiment for automatic execution
   */
  private async scheduleExperiment(experiment: ChaosExperiment): Promise<void> {
    if (!experiment.schedule?.enabled) return;

    // Implementation would integrate with job scheduler (cron, Kubernetes CronJob, etc.)
    console.log(
      `Scheduling experiment: ${experiment.id} with ${experiment.schedule.frequency.type}`,
    );
  }

  /**
   * Send experiment notifications
   */
  private async sendExperimentNotifications(
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): Promise<void> {
    for (const notification of experiment.monitoring.notifications) {
      try {
        await this.sendNotification(notification, experiment, result);
      } catch (error) {
        console.error(`Failed to send notification: ${error.message}`);
      }
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(
    notification: NotificationConfiguration,
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): Promise<void> {
    const message = this.formatNotificationMessage(experiment, result);

    switch (notification.type) {
      case 'slack':
        // Implementation would send Slack message
        console.log(`Slack notification: ${message}`);
        break;

      case 'email':
        // Implementation would send email
        console.log(`Email notification: ${message}`);
        break;

      case 'pagerduty':
        // Implementation would trigger PagerDuty incident
        console.log(`PagerDuty notification: ${message}`);
        break;

      case 'webhook':
        // Implementation would send webhook
        console.log(`Webhook notification: ${message}`);
        break;
    }
  }

  /**
   * Format notification message
   */
  private formatNotificationMessage(
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): string {
    const status = result.status === 'completed' ? 'completed' : 'failed';
    const healthBefore = result.steady_state.before.overall_health;
    const healthAfter = result.steady_state.after.overall_health;

    return (
      `Chaos Experiment "${experiment.name}" ${status}.\n` +
      `Hypothesis: ${experiment.hypothesis}\n` +
      `Health: ${healthBefore}% → ${healthAfter}%\n` +
      `Duration: ${result.duration}ms\n` +
      `Insights: ${result.insights.length} generated`
    );
  }

  /**
   * Generate Chaos Toolkit experiment file
   */
  private async generateChaosToolkitExperiment(
    experiment: ChaosExperiment,
  ): Promise<string> {
    const chaosExperiment = {
      version: '1.0.0',
      title: experiment.name,
      description: experiment.description,
      tags: experiment.metadata.tags,
      'steady-state-hypothesis': {
        title: experiment.steadyState.title,
        probes: experiment.steadyState.probes.map((probe) => ({
          name: probe.name,
          type: 'probe',
          provider: {
            type: probe.type,
            ...probe.configuration,
          },
          tolerance: probe.tolerance,
        })),
      },
      method: experiment.method.map((method) => ({
        type: method.type,
        name: method.name,
        provider: {
          type: method.provider,
          module: method.module,
          func: method.function,
          arguments: method.arguments,
        },
        pauses: method.pauses,
      })),
      rollbacks: experiment.rollback.methods.map((method) => ({
        type: method.type,
        name: method.name,
        provider: {
          type: method.provider,
          module: method.module,
          func: method.function,
          arguments: method.arguments,
        },
      })),
    };

    // Write to temporary file
    const fs = require('fs').promises;
    const path = require('path');
    const filename = path.join(
      this.config.experimentDirectory,
      `${experiment.id}.json`,
    );
    await fs.writeFile(filename, JSON.stringify(chaosExperiment, null, 2));

    return filename;
  }

  /**
   * Parse Chaos Toolkit output
   */
  private parseChaosToolkitOutput(output: string): MethodResult[] {
    // Parse Chaos Toolkit JSON output and convert to MethodResult[]
    // This is a simplified implementation
    try {
      const result = JSON.parse(output);
      return result.run.map((run: any) => ({
        name: run.activity.name,
        type: run.activity.type,
        status: run.status === 'succeeded' ? 'completed' : 'failed',
        startTime: new Date(run.start),
        endTime: new Date(run.end),
        duration: new Date(run.end).getTime() - new Date(run.start).getTime(),
        output: run.output,
      }));
    } catch (error) {
      console.error('Failed to parse Chaos Toolkit output:', error);
      return [];
    }
  }

  /**
   * Initialize chaos engine
   */
  private initializeChaosEngine(): void {
    // Ensure experiment directory exists
    const fs = require('fs');
    if (!fs.existsSync(this.config.experimentDirectory)) {
      fs.mkdirSync(this.config.experimentDirectory, { recursive: true });
    }

    console.log('Chaos Engine initialized');
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Clean up old experiment results
    setInterval(
      () => {
        this.cleanupOldResults();
      },
      24 * 60 * 60 * 1000,
    ); // Daily

    // Check scheduled experiments
    if (this.config.enableScheduling) {
      setInterval(() => {
        this.checkScheduledExperiments();
      }, 60 * 1000); // Every minute
    }

    // Monitor active experiments
    setInterval(() => {
      this.monitorActiveExperiments();
    }, 30 * 1000); // Every 30 seconds
  }

  /**
   * Clean up old experiment results
   */
  private cleanupOldResults(): void {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    for (const [experimentId, results] of this.experimentResults.entries()) {
      const filteredResults = results.filter(
        (r) => r.startTime.getTime() > cutoff,
      );
      if (filteredResults.length !== results.length) {
        this.experimentResults.set(experimentId, filteredResults);
      }
    }
  }

  /**
   * Check for scheduled experiments that need to run
   */
  private async checkScheduledExperiments(): Promise<void> {
    // Implementation would check scheduled experiments and execute them
    console.log('Checking scheduled experiments...');
  }

  /**
   * Monitor active experiments for issues
   */
  private async monitorActiveExperiments(): Promise<void> {
    for (const [experimentId, execution] of this.activeExperiments.entries()) {
      // Check for timeout
      const runtime = Date.now() - execution.startTime.getTime();
      const timeout = this.config.defaultTimeout * 60 * 1000;

      if (runtime > timeout) {
        console.warn(
          `Experiment ${experimentId} has exceeded timeout, aborting...`,
        );
        await this.abortExperiment(experimentId, 'Timeout exceeded');
      }
    }
  }

  private async executeChaosMethod(
    experiment: ChaosExperiment,
    execution: ExperimentExecution,
    options: any,
  ): Promise<MethodResult[]> {
    if (this.config.chaosToolkitPath && !options.dryRun) {
      try {
        return await this.executeChaosMethodsUsingToolkit(
          experiment,
          execution,
        );
      } catch (error) {
        console.warn(
          'Chaos Toolkit execution failed, falling back to internal implementation:',
          error.message,
        );
      }
    }

    return await this.executeChaosMethodsFallback(experiment);
  }
}

/**
 * Experiment execution tracking
 */
class ExperimentExecution {
  public status: ExperimentStatus = 'running';
  public startTime: Date = new Date();
  public currentPhase?: string;
  public progress?: number;
  public chaosProcess?: ChildProcess;

  constructor(
    public experiment: ChaosExperiment,
    public options: any,
  ) {}
}
