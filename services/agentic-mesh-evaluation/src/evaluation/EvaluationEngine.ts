/**
 * Evaluation Engine - Comprehensive Mesh Testing & Scenario Execution
 * Runs evaluation scenarios and generates detailed performance reports
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import type {
  EvaluationRun,
  EvaluationScenario,
  EvaluationResults,
  EvaluationMetrics,
  Finding,
  Recommendation,
  Benchmark,
  AgenticMesh,
} from '../types/mesh.js';
import { MeshCoordinator } from '../coordinator/MeshCoordinator.js';
import { MetricsCollector } from '../metrics/MetricsCollector.js';

export interface ScenarioConfig {
  name: string;
  description: string;
  duration: number; // seconds
  phases: ScenarioPhase[];
  successCriteria: SuccessCriteria[];
}

export interface ScenarioPhase {
  name: string;
  duration: number;
  actions: PhaseAction[];
}

export interface PhaseAction {
  type: string;
  params: Record<string, unknown>;
  delay?: number;
}

export interface SuccessCriteria {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  critical: boolean;
}

export class EvaluationEngine extends EventEmitter {
  private evaluations: Map<string, EvaluationRun>;
  private scenarioRegistry: Map<EvaluationScenario, ScenarioConfig>;

  constructor(
    private coordinator: MeshCoordinator,
    private metrics: MetricsCollector
  ) {
    super();
    this.evaluations = new Map();
    this.scenarioRegistry = new Map();

    // Register built-in scenarios
    this.registerBuiltInScenarios();
  }

  /**
   * Register built-in evaluation scenarios
   */
  private registerBuiltInScenarios(): void {
    // Performance Baseline
    this.registerScenario('performance-baseline', {
      name: 'Performance Baseline',
      description: 'Establish baseline performance metrics under normal load',
      duration: 300, // 5 minutes
      phases: [
        {
          name: 'Warmup',
          duration: 60,
          actions: [
            { type: 'submit-tasks', params: { rate: 10, count: 100 } },
          ],
        },
        {
          name: 'Measurement',
          duration: 180,
          actions: [
            { type: 'submit-tasks', params: { rate: 50, count: 1000 } },
            { type: 'collect-metrics', params: { interval: 10 } },
          ],
        },
        {
          name: 'Cooldown',
          duration: 60,
          actions: [
            { type: 'submit-tasks', params: { rate: 10, count: 100 } },
          ],
        },
      ],
      successCriteria: [
        {
          metric: 'averageLatencyMs',
          operator: '<',
          threshold: 1000,
          critical: true,
        },
        {
          metric: 'errorRate',
          operator: '<',
          threshold: 1,
          critical: true,
        },
        {
          metric: 'successRate',
          operator: '>',
          threshold: 99,
          critical: true,
        },
      ],
    });

    // Load Testing
    this.registerScenario('load-testing', {
      name: 'Load Testing',
      description:
        'Test system performance under increasing load',
      duration: 600,
      phases: [
        {
          name: 'Low Load',
          duration: 120,
          actions: [
            { type: 'submit-tasks', params: { rate: 50, count: 500 } },
          ],
        },
        {
          name: 'Medium Load',
          duration: 120,
          actions: [
            { type: 'submit-tasks', params: { rate: 100, count: 1000 } },
          ],
        },
        {
          name: 'High Load',
          duration: 120,
          actions: [
            { type: 'submit-tasks', params: { rate: 200, count: 2000 } },
          ],
        },
        {
          name: 'Peak Load',
          duration: 120,
          actions: [
            { type: 'submit-tasks', params: { rate: 500, count: 5000 } },
          ],
        },
        {
          name: 'Recovery',
          duration: 120,
          actions: [
            { type: 'submit-tasks', params: { rate: 50, count: 500 } },
          ],
        },
      ],
      successCriteria: [
        {
          metric: 'p95LatencyMs',
          operator: '<',
          threshold: 5000,
          critical: false,
        },
        {
          metric: 'throughput',
          operator: '>',
          threshold: 100,
          critical: true,
        },
      ],
    });

    // Stress Testing
    this.registerScenario('stress-testing', {
      name: 'Stress Testing',
      description: 'Push system to its limits to find breaking points',
      duration: 600,
      phases: [
        {
          name: 'Ramp Up',
          duration: 180,
          actions: [
            {
              type: 'ramp-load',
              params: { start: 100, end: 1000, step: 100 },
            },
          ],
        },
        {
          name: 'Sustained Peak',
          duration: 300,
          actions: [
            { type: 'submit-tasks', params: { rate: 1000, count: 10000 } },
          ],
        },
        {
          name: 'Ramp Down',
          duration: 120,
          actions: [
            {
              type: 'ramp-load',
              params: { start: 1000, end: 100, step: -100 },
            },
          ],
        },
      ],
      successCriteria: [
        { metric: 'errorRate', operator: '<', threshold: 5, critical: false },
      ],
    });

    // Fault Injection
    this.registerScenario('fault-injection', {
      name: 'Fault Injection',
      description: 'Test system resilience by injecting failures',
      duration: 300,
      phases: [
        {
          name: 'Baseline',
          duration: 60,
          actions: [
            { type: 'submit-tasks', params: { rate: 50, count: 500 } },
          ],
        },
        {
          name: 'Single Node Failure',
          duration: 60,
          actions: [
            { type: 'fail-node', params: { count: 1 } },
            { type: 'submit-tasks', params: { rate: 50, count: 500 } },
          ],
        },
        {
          name: 'Network Partition',
          duration: 60,
          actions: [
            { type: 'partition-network', params: { percentage: 20 } },
            { type: 'submit-tasks', params: { rate: 50, count: 500 } },
          ],
        },
        {
          name: 'Recovery',
          duration: 60,
          actions: [
            { type: 'heal-all', params: {} },
            { type: 'submit-tasks', params: { rate: 50, count: 500 } },
          ],
        },
        {
          name: 'Validation',
          duration: 60,
          actions: [
            { type: 'submit-tasks', params: { rate: 50, count: 500 } },
          ],
        },
      ],
      successCriteria: [
        {
          metric: 'availability',
          operator: '>',
          threshold: 99,
          critical: true,
        },
        {
          metric: 'mttr',
          operator: '<',
          threshold: 30,
          critical: true,
        },
      ],
    });

    // Chaos Engineering
    this.registerScenario('chaos-engineering', {
      name: 'Chaos Engineering',
      description: 'Random failure injection to test resilience',
      duration: 900,
      phases: [
        {
          name: 'Chaos',
          duration: 900,
          actions: [
            {
              type: 'chaos',
              params: {
                failureRate: 0.1,
                latencyInjection: true,
                networkChaos: true,
              },
            },
            { type: 'submit-tasks', params: { rate: 100, count: 5000 } },
          ],
        },
      ],
      successCriteria: [
        {
          metric: 'successRate',
          operator: '>',
          threshold: 95,
          critical: true,
        },
      ],
    });

    // Scalability Testing
    this.registerScenario('scalability-testing', {
      name: 'Scalability Testing',
      description: 'Test horizontal and vertical scaling',
      duration: 600,
      phases: [
        {
          name: 'Baseline (N nodes)',
          duration: 120,
          actions: [
            { type: 'submit-tasks', params: { rate: 100, count: 1000 } },
          ],
        },
        {
          name: 'Scale Up (2N nodes)',
          duration: 120,
          actions: [
            { type: 'scale-nodes', params: { factor: 2 } },
            { type: 'submit-tasks', params: { rate: 200, count: 2000 } },
          ],
        },
        {
          name: 'Scale Up (4N nodes)',
          duration: 120,
          actions: [
            { type: 'scale-nodes', params: { factor: 4 } },
            { type: 'submit-tasks', params: { rate: 400, count: 4000 } },
          ],
        },
        {
          name: 'Scale Down (2N nodes)',
          duration: 120,
          actions: [
            { type: 'scale-nodes', params: { factor: 2 } },
            { type: 'submit-tasks', params: { rate: 200, count: 2000 } },
          ],
        },
        {
          name: 'Back to Baseline',
          duration: 120,
          actions: [
            { type: 'scale-nodes', params: { factor: 1 } },
            { type: 'submit-tasks', params: { rate: 100, count: 1000 } },
          ],
        },
      ],
      successCriteria: [
        {
          metric: 'linearScalability',
          operator: '>',
          threshold: 80,
          critical: false,
        },
      ],
    });
  }

  /**
   * Register a custom scenario
   */
  registerScenario(
    scenario: EvaluationScenario,
    config: ScenarioConfig
  ): void {
    this.scenarioRegistry.set(scenario, config);
  }

  /**
   * Start an evaluation run
   */
  async startEvaluation(params: {
    meshId: string;
    scenario: EvaluationScenario;
    scenarioParams?: Record<string, unknown>;
    baselineId?: string;
    triggeredBy: string;
    triggerType?: 'manual' | 'scheduled' | 'automated' | 'ci-cd';
    tags?: string[];
  }): Promise<EvaluationRun> {
    const evaluationId = nanoid();
    const now = new Date();

    const scenarioConfig = this.scenarioRegistry.get(params.scenario);
    if (!scenarioConfig) {
      throw new Error(`Unknown scenario: ${params.scenario}`);
    }

    const evaluation: EvaluationRun = {
      id: evaluationId,
      meshId: params.meshId,
      scenario: params.scenario,
      scenarioParams: params.scenarioParams || {},
      status: 'pending',
      phase: 'setup',
      startedAt: now,
      baselineId: params.baselineId,
      comparisonIds: [],
      results: this.initializeResults(),
      triggeredBy: params.triggeredBy,
      triggerType: params.triggerType || 'manual',
      tags: params.tags || [],
      metadata: {},
      createdAt: now,
    };

    this.evaluations.set(evaluationId, evaluation);

    // Start execution asynchronously
    this.executeEvaluation(evaluationId, scenarioConfig);

    this.emit('evaluation-started', evaluation);

    return evaluation;
  }

  /**
   * Execute evaluation scenario
   */
  private async executeEvaluation(
    evaluationId: string,
    config: ScenarioConfig
  ): Promise<void> {
    const evaluation = this.evaluations.get(evaluationId);
    if (!evaluation) return;

    try {
      evaluation.status = 'initializing';
      evaluation.phase = 'warmup';

      // Capture initial state
      const initialMetrics = await this.metrics.getMetrics(
        evaluation.meshId
      );

      evaluation.status = 'running';

      // Execute each phase
      for (const phase of config.phases) {
        evaluation.phase = 'execution';
        await this.executePhase(evaluation, phase);
      }

      // Cooldown
      evaluation.phase = 'cooldown';
      await this.wait(10000); // 10 second cooldown

      // Collect final metrics
      evaluation.phase = 'analysis';
      const finalMetrics = await this.metrics.getMetrics(evaluation.meshId);

      // Analyze results
      evaluation.results = await this.analyzeResults(
        evaluation,
        config,
        initialMetrics,
        finalMetrics
      );

      // Generate report
      evaluation.phase = 'reporting';
      await this.generateReport(evaluation);

      // Complete
      evaluation.status = 'completed';
      evaluation.completedAt = new Date();
      evaluation.durationMs =
        evaluation.completedAt.getTime() - evaluation.startedAt.getTime();

      this.emit('evaluation-completed', evaluation);
    } catch (error) {
      evaluation.status = 'failed';
      evaluation.completedAt = new Date();
      this.emit('evaluation-failed', { evaluation, error });
    }
  }

  /**
   * Execute a scenario phase
   */
  private async executePhase(
    evaluation: EvaluationRun,
    phase: ScenarioPhase
  ): Promise<void> {
    const startTime = Date.now();

    for (const action of phase.actions) {
      if (action.delay) {
        await this.wait(action.delay);
      }

      await this.executeAction(evaluation, action);
    }

    // Wait for phase duration
    const elapsed = Date.now() - startTime;
    const remaining = phase.duration * 1000 - elapsed;
    if (remaining > 0) {
      await this.wait(remaining);
    }

    this.emit('phase-completed', { evaluation, phase });
  }

  /**
   * Execute a phase action
   */
  private async executeAction(
    evaluation: EvaluationRun,
    action: PhaseAction
  ): Promise<void> {
    switch (action.type) {
      case 'submit-tasks':
        await this.submitTasks(evaluation, action.params);
        break;

      case 'collect-metrics':
        await this.collectMetrics(evaluation, action.params);
        break;

      case 'fail-node':
        await this.failNodes(evaluation, action.params);
        break;

      case 'heal-all':
        await this.healAll(evaluation);
        break;

      case 'ramp-load':
        await this.rampLoad(evaluation, action.params);
        break;

      case 'partition-network':
        await this.partitionNetwork(evaluation, action.params);
        break;

      case 'chaos':
        await this.runChaos(evaluation, action.params);
        break;

      case 'scale-nodes':
        await this.scaleNodes(evaluation, action.params);
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }

    this.emit('action-executed', { evaluation, action });
  }

  /**
   * Submit tasks to the mesh
   */
  private async submitTasks(
    evaluation: EvaluationRun,
    params: Record<string, unknown>
  ): Promise<void> {
    const rate = (params.rate as number) || 10;
    const count = (params.count as number) || 100;
    const interval = 1000 / rate; // ms between tasks

    for (let i = 0; i < count; i++) {
      await this.coordinator.submitTask({
        meshId: evaluation.meshId,
        type: 'computation',
        name: `eval-task-${i}`,
        payload: { evaluationId: evaluation.id, taskIndex: i },
        priority: 50,
      });

      if (i < count - 1) {
        await this.wait(interval);
      }
    }
  }

  /**
   * Collect metrics snapshot
   */
  private async collectMetrics(
    evaluation: EvaluationRun,
    params: Record<string, unknown>
  ): Promise<void> {
    const interval = (params.interval as number) || 10;
    const metrics = await this.metrics.getMetrics(evaluation.meshId);
    // Store metrics snapshot
  }

  /**
   * Fail nodes for fault injection
   */
  private async failNodes(
    evaluation: EvaluationRun,
    params: Record<string, unknown>
  ): Promise<void> {
    const count = (params.count as number) || 1;
    const mesh = this.coordinator.getMesh(evaluation.meshId);
    if (!mesh) return;

    const healthyNodes = mesh.nodes.filter(
      (n) => n.status === 'ready' || n.status === 'idle'
    );

    for (let i = 0; i < Math.min(count, healthyNodes.length); i++) {
      const node = healthyNodes[i];
      node.status = 'failed';
      this.emit('node-failed-injected', { evaluation, nodeId: node.id });
    }
  }

  /**
   * Heal all failed nodes
   */
  private async healAll(evaluation: EvaluationRun): Promise<void> {
    const mesh = this.coordinator.getMesh(evaluation.meshId);
    if (!mesh) return;

    mesh.nodes.forEach((node) => {
      if (node.status === 'failed') {
        node.status = 'ready';
        this.emit('node-healed', { evaluation, nodeId: node.id });
      }
    });
  }

  /**
   * Ramp load up or down
   */
  private async rampLoad(
    evaluation: EvaluationRun,
    params: Record<string, unknown>
  ): Promise<void> {
    const start = (params.start as number) || 10;
    const end = (params.end as number) || 100;
    const step = (params.step as number) || 10;

    const steps = Math.abs(end - start) / Math.abs(step);
    for (let i = 0; i <= steps; i++) {
      const rate = start + step * i;
      await this.submitTasks(evaluation, { rate, count: rate * 10 });
      await this.wait(10000); // 10 seconds per step
    }
  }

  /**
   * Partition network
   */
  private async partitionNetwork(
    evaluation: EvaluationRun,
    params: Record<string, unknown>
  ): Promise<void> {
    const percentage = (params.percentage as number) || 20;
    // Simulate network partition by failing edges
    this.emit('network-partitioned', { evaluation, percentage });
  }

  /**
   * Run chaos engineering
   */
  private async runChaos(
    evaluation: EvaluationRun,
    params: Record<string, unknown>
  ): Promise<void> {
    // Random failures, latency injection, etc.
    this.emit('chaos-started', { evaluation, params });
  }

  /**
   * Scale nodes
   */
  private async scaleNodes(
    evaluation: EvaluationRun,
    params: Record<string, unknown>
  ): Promise<void> {
    const factor = (params.factor as number) || 1;
    // Scale mesh nodes
    this.emit('nodes-scaled', { evaluation, factor });
  }

  /**
   * Analyze evaluation results
   */
  private async analyzeResults(
    evaluation: EvaluationRun,
    config: ScenarioConfig,
    initialMetrics: any,
    finalMetrics: any
  ): Promise<EvaluationResults> {
    const results = evaluation.results;

    // Calculate scores
    results.score = this.calculateScore(config, finalMetrics);
    results.grade = this.calculateGrade(results.score);
    results.passed = this.evaluateSuccessCriteria(
      config.successCriteria,
      finalMetrics
    );

    // Generate findings
    results.findings = await this.generateFindings(evaluation, finalMetrics);

    // Generate recommendations
    results.recommendations = await this.generateRecommendations(
      evaluation,
      results.findings
    );

    // Generate benchmarks
    results.benchmarks = await this.generateBenchmarks(
      evaluation,
      config,
      finalMetrics
    );

    // Generate comparison if baseline exists
    if (evaluation.baselineId) {
      results.comparison = await this.generateComparison(
        evaluation,
        evaluation.baselineId
      );
    }

    return results;
  }

  /**
   * Calculate overall score
   */
  private calculateScore(
    config: ScenarioConfig,
    metrics: any
  ): number {
    // Weighted scoring based on success criteria
    let score = 100;
    let totalWeight = 0;

    for (const criteria of config.successCriteria) {
      const weight = criteria.critical ? 10 : 5;
      totalWeight += weight;

      const metricValue = this.getMetricValue(metrics, criteria.metric);
      const passed = this.evaluateCriteria(
        metricValue,
        criteria.operator,
        criteria.threshold
      );

      if (!passed) {
        score -= weight;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(
    score: number
  ): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Evaluate success criteria
   */
  private evaluateSuccessCriteria(
    criteria: SuccessCriteria[],
    metrics: any
  ): boolean {
    for (const criterion of criteria) {
      if (criterion.critical) {
        const metricValue = this.getMetricValue(metrics, criterion.metric);
        const passed = this.evaluateCriteria(
          metricValue,
          criterion.operator,
          criterion.threshold
        );

        if (!passed) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate a single criteria
   */
  private evaluateCriteria(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '=':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: any, metricPath: string): number {
    const parts = metricPath.split('.');
    let value = metrics;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * Generate findings
   */
  private async generateFindings(
    evaluation: EvaluationRun,
    metrics: any
  ): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Performance findings
    if (metrics?.aggregateMetrics?.averageLatencyMs > 1000) {
      findings.push({
        id: nanoid(),
        severity: 'high',
        category: 'performance',
        title: 'High Average Latency',
        description: `Average latency of ${metrics.aggregateMetrics.averageLatencyMs}ms exceeds acceptable threshold`,
        impact: 'Degraded user experience and reduced throughput',
        evidence: { averageLatencyMs: metrics.aggregateMetrics.averageLatencyMs },
        affectedNodes: [],
        timestamp: new Date(),
      });
    }

    // Reliability findings
    if (metrics?.aggregateMetrics?.errorRate > 1) {
      findings.push({
        id: nanoid(),
        severity: 'critical',
        category: 'reliability',
        title: 'Elevated Error Rate',
        description: `Error rate of ${metrics.aggregateMetrics.errorRate}% indicates reliability issues`,
        impact: 'Reduced system reliability and potential data loss',
        evidence: { errorRate: metrics.aggregateMetrics.errorRate },
        affectedNodes: [],
        timestamp: new Date(),
      });
    }

    return findings;
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    evaluation: EvaluationRun,
    findings: Finding[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const finding of findings) {
      if (finding.category === 'performance') {
        recommendations.push({
          id: nanoid(),
          priority: 'high',
          category: 'performance',
          title: 'Optimize Task Distribution',
          description:
            'Implement better load balancing to distribute tasks more evenly',
          rationale:
            'High latency indicates uneven load distribution across nodes',
          implementation:
            'Switch to capability-based routing or implement weighted round-robin',
          estimatedImpact: '30-50% reduction in average latency',
          estimatedEffort: '2-3 days',
          relatedFindings: [finding.id],
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate benchmarks
   */
  private async generateBenchmarks(
    evaluation: EvaluationRun,
    config: ScenarioConfig,
    metrics: any
  ): Promise<Benchmark[]> {
    const benchmarks: Benchmark[] = [];

    for (const criteria of config.successCriteria) {
      const value = this.getMetricValue(metrics, criteria.metric);
      const passed = this.evaluateCriteria(
        value,
        criteria.operator,
        criteria.threshold
      );

      benchmarks.push({
        name: criteria.metric,
        metric: criteria.metric,
        value,
        unit: this.getMetricUnit(criteria.metric),
        target: criteria.threshold,
        passed,
      });
    }

    return benchmarks;
  }

  /**
   * Get metric unit
   */
  private getMetricUnit(metric: string): string {
    if (metric.includes('Latency') || metric.includes('Duration'))
      return 'ms';
    if (metric.includes('Rate') || metric.includes('Percentage')) return '%';
    if (metric.includes('throughput')) return 'ops/s';
    return 'count';
  }

  /**
   * Generate comparison with baseline
   */
  private async generateComparison(
    evaluation: EvaluationRun,
    baselineId: string
  ): Promise<any> {
    // Compare with baseline evaluation
    return {
      baselineId,
      improvements: [],
      regressions: [],
      unchanged: [],
      summary: 'Comparison with baseline',
    };
  }

  /**
   * Generate evaluation report
   */
  private async generateReport(evaluation: EvaluationRun): Promise<void> {
    // Generate PDF/HTML report
    this.emit('report-generated', evaluation);
  }

  /**
   * Initialize empty results
   */
  private initializeResults(): EvaluationResults {
    return {
      passed: false,
      score: 0,
      grade: 'F',
      metrics: {
        performance: {
          latency: {
            min: 0,
            max: 0,
            mean: 0,
            median: 0,
            p95: 0,
            p99: 0,
            p999: 0,
            stdDev: 0,
          },
          throughput: {
            requestsPerSecond: 0,
            tasksPerSecond: 0,
            messagesPerSecond: 0,
            bytesPerSecond: 0,
          },
          responseTime: {
            average: 0,
            fastest: 0,
            slowest: 0,
            distribution: {},
          },
        },
        reliability: {
          uptime: 100,
          availability: 100,
          mtbf: 0,
          mttr: 0,
          errorRate: 0,
          successRate: 100,
          failureRate: 0,
        },
        scalability: {
          maxConcurrentTasks: 0,
          horizontalScalability: 0,
          verticalScalability: 0,
          elasticity: 0,
          efficiency: 0,
        },
        efficiency: {
          resourceUtilization: 0,
          costPerTask: 0,
          energyEfficiency: 0,
          wasteRatio: 0,
        },
        security: {
          vulnerabilities: 0,
          criticalVulnerabilities: 0,
          authenticationFailures: 0,
          authorizationFailures: 0,
          encryptionCoverage: 100,
          securityScore: 100,
        },
        compliance: {
          policyViolations: 0,
          criticalViolations: 0,
          complianceRate: 100,
          auditCoverage: 100,
          certificationStatus: 'pending',
        },
      },
      findings: [],
      recommendations: [],
      benchmarks: [],
      artifacts: [],
    };
  }

  /**
   * Utility: wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get evaluation by ID
   */
  getEvaluation(evaluationId: string): EvaluationRun | undefined {
    return this.evaluations.get(evaluationId);
  }

  /**
   * Get all evaluations for a mesh
   */
  getEvaluations(meshId?: string): EvaluationRun[] {
    const evals = Array.from(this.evaluations.values());
    return meshId ? evals.filter((e) => e.meshId === meshId) : evals;
  }
}
