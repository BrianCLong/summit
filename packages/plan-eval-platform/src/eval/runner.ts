import { randomUUID } from 'node:crypto';
import { TraceBuilder } from '../runtime/trace-schema.js';
import { TelemetryClient } from '../runtime/telemetry-client.js';
import { CostModel } from '../runtime/cost-model.js';
import { ScenarioLoader } from './scenario-loader.js';
import { MetricsCollector } from './metrics.js';
import type {
  Scenario,
  ScenarioResult,
  ScenarioStep,
  SuccessCriteria,
  EvalMetrics,
  RoutingConfig,
  SafetyConfig,
  Trace,
} from '../types.js';

export interface EvalRunnerConfig {
  scenariosPath: string;
  outputPath: string;
  routingConfig: RoutingConfig;
  safetyConfig: SafetyConfig;
  maxConcurrency: number;
  timeoutMs: number;
  dryRun: boolean;
}

const DEFAULT_CONFIG: EvalRunnerConfig = {
  scenariosPath: './scenarios',
  outputPath: './experiments/traces.jsonl',
  routingConfig: {
    type: 'greedy_cost',
    costWeight: 0.5,
    latencyBudgetMs: 5000,
    fallbackEnabled: true,
  },
  safetyConfig: {
    enabledChecks: ['jailbreak_detection', 'pii_detection', 'harmful_content'],
    blockOnViolation: true,
    logViolations: true,
  },
  maxConcurrency: 4,
  timeoutMs: 60000,
  dryRun: false,
};

/**
 * EvalRunner - Execute scenarios and collect traces
 *
 * Core evaluation engine that:
 * - Loads and validates scenarios
 * - Executes steps with tracing
 * - Applies routing decisions
 * - Performs safety checks
 * - Collects and aggregates metrics
 */
export class EvalRunner {
  private readonly config: EvalRunnerConfig;
  private readonly scenarioLoader: ScenarioLoader;
  private readonly telemetry: TelemetryClient;
  private readonly costModel: CostModel;
  private readonly metricsCollector: MetricsCollector;
  private router?: (
    step: ScenarioStep,
    scenario: Scenario,
  ) => Promise<{ tool: string; score: number; reasoning: string[] }>;
  private safetyChecker?: (
    input: unknown,
  ) => Promise<{ passed: boolean; violations: string[] }>;

  constructor(config: Partial<EvalRunnerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scenarioLoader = new ScenarioLoader(this.config.scenariosPath);
    this.telemetry = new TelemetryClient({
      outputPath: this.config.outputPath,
    });
    this.costModel = new CostModel();
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * Set a custom router implementation
   */
  setRouter(
    router: (
      step: ScenarioStep,
      scenario: Scenario,
    ) => Promise<{ tool: string; score: number; reasoning: string[] }>,
  ): void {
    this.router = router;
  }

  /**
   * Set a custom safety checker implementation
   */
  setSafetyChecker(
    checker: (
      input: unknown,
    ) => Promise<{ passed: boolean; violations: string[] }>,
  ): void {
    this.safetyChecker = checker;
  }

  /**
   * Run a single scenario
   */
  async runScenario(scenarioId: string): Promise<ScenarioResult> {
    const scenario = this.scenarioLoader.loadScenario(scenarioId);
    return this.executeScenario(scenario);
  }

  /**
   * Run all scenarios
   */
  async runAll(): Promise<ScenarioResult[]> {
    const scenarios = this.scenarioLoader.loadAll();
    const results: ScenarioResult[] = [];

    // Run with concurrency limit
    const chunks = this.chunkArray(scenarios, this.config.maxConcurrency);
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((s) => this.executeScenario(s)),
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Run scenarios by category
   */
  async runByCategory(
    category: Scenario['category'],
  ): Promise<ScenarioResult[]> {
    const scenarios = this.scenarioLoader.loadByCategory(category);
    return Promise.all(scenarios.map((s) => this.executeScenario(s)));
  }

  /**
   * Execute a single scenario
   */
  private async executeScenario(scenario: Scenario): Promise<ScenarioResult> {
    const runId = randomUUID();
    const trace = new TraceBuilder(scenario.id, runId);
    const errors: ScenarioResult['errors'] = [];
    const assertions: ScenarioResult['assertions'] = [];

    // Start request trace
    const requestEventId = trace.startEvent('request_start', scenario.name, {
      scenarioId: scenario.id,
      category: scenario.category,
      difficulty: scenario.difficulty,
    });

    try {
      // Execute each step
      for (const step of scenario.steps) {
        await this.executeStep(step, scenario, trace, errors);
      }

      // Evaluate success criteria
      for (const criteria of scenario.successCriteria) {
        const passed = await this.evaluateCriteria(criteria, trace);
        assertions.push({ criteria, passed, actual: null });
      }
    } catch (err) {
      const error = err as Error;
      trace.recordError('execution_error', error.message, error.stack);
      errors.push({
        step: 'scenario',
        error: error.message,
        recoverable: false,
      });
    }

    // End request trace
    const success =
      errors.length === 0 && assertions.every((a) => a.passed);
    trace.endEvent(requestEventId, success ? 'success' : 'failure', {
      durationMs: Date.now() - Date.parse(trace.build().startTime),
    });

    // Build final trace
    const finalTrace = trace.build();
    this.telemetry.recordTrace(finalTrace);

    // Calculate metrics
    const metrics = this.calculateMetrics(finalTrace);

    return {
      scenarioId: scenario.id,
      runId,
      success,
      metrics,
      trace: finalTrace,
      errors,
      assertions,
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: ScenarioStep,
    scenario: Scenario,
    trace: TraceBuilder,
    errors: ScenarioResult['errors'],
  ): Promise<void> {
    const stepEventId = trace.startEvent('tool_call_start', step.id, {
      type: step.type,
      allowedTools: step.allowedTools,
    });

    const startTime = Date.now();

    try {
      // Safety check on input
      if (this.safetyChecker && step.input) {
        const safetyResult = await this.safetyChecker(step.input);
        trace.recordSafetyCheck(
          'input_check',
          safetyResult.passed,
          safetyResult.passed ? 'low' : 'high',
          safetyResult.violations.join(', '),
        );

        if (!safetyResult.passed && this.config.safetyConfig.blockOnViolation) {
          throw new Error(
            `Safety violation: ${safetyResult.violations.join(', ')}`,
          );
        }
      }

      // Route to tool
      if (this.router && step.allowedTools && step.allowedTools.length > 0) {
        const routingDecision = await this.router(step, scenario);
        trace.recordRoutingDecision(
          routingDecision.tool,
          routingDecision.score,
          routingDecision.reasoning,
          [],
        );
      }

      // Simulate execution (in production, this would call actual tools)
      if (!this.config.dryRun) {
        await this.simulateExecution(step);
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (step.timeout && elapsed > step.timeout) {
        throw new Error(`Step timeout: ${elapsed}ms > ${step.timeout}ms`);
      }

      // Check constraints
      if (step.constraints?.maxLatencyMs && elapsed > step.constraints.maxLatencyMs) {
        errors.push({
          step: step.id,
          error: `Latency constraint violated: ${elapsed}ms > ${step.constraints.maxLatencyMs}ms`,
          recoverable: true,
        });
      }

      trace.endEvent(stepEventId, 'success', {
        durationMs: elapsed,
        latencyMs: elapsed,
      });
    } catch (err) {
      const error = err as Error;
      trace.endEvent(
        stepEventId,
        'failure',
        { durationMs: Date.now() - startTime },
        { code: 'step_error', message: error.message },
      );
      errors.push({
        step: step.id,
        error: error.message,
        recoverable: false,
      });
    }
  }

  /**
   * Simulate step execution (placeholder for actual tool execution)
   */
  private async simulateExecution(step: ScenarioStep): Promise<void> {
    // Simulate some latency
    const baseLatency = 100;
    const variance = Math.random() * 200;
    await new Promise((resolve) =>
      setTimeout(resolve, baseLatency + variance),
    );
  }

  /**
   * Evaluate success criteria
   */
  private async evaluateCriteria(
    criteria: SuccessCriteria,
    trace: TraceBuilder,
  ): Promise<boolean> {
    // Build trace to get current state
    const builtTrace = trace.build();

    switch (criteria.type) {
      case 'exact_match':
        return builtTrace.summary?.success === criteria.value;

      case 'contains':
        return JSON.stringify(builtTrace).includes(String(criteria.value));

      case 'regex':
        const regex = new RegExp(String(criteria.value));
        return regex.test(JSON.stringify(builtTrace));

      case 'semantic_similarity':
        // Placeholder - would use embedding comparison
        return true;

      case 'custom':
        // Placeholder - would evaluate custom function
        return true;

      default:
        return false;
    }
  }

  /**
   * Calculate metrics from a trace
   */
  private calculateMetrics(trace: Trace): EvalMetrics {
    const summary = trace.summary ?? {
      success: false,
      totalDurationMs: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      toolCallCount: 0,
      errorCount: 0,
      safetyViolations: 0,
    };

    return {
      taskSuccessRate: summary.success ? 1 : 0,
      taskCompletionTime: summary.totalDurationMs,
      totalTokens: summary.totalTokens,
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: summary.totalCostUsd,
      costPerSuccessfulTask: summary.success ? summary.totalCostUsd : 0,
      p50LatencyMs: summary.totalDurationMs,
      p95LatencyMs: summary.totalDurationMs,
      p99LatencyMs: summary.totalDurationMs,
      avgLatencyMs: summary.totalDurationMs,
      toolCallCount: summary.toolCallCount,
      toolSuccessRate: summary.errorCount === 0 ? 1 : 0,
      avgToolLatencyMs:
        summary.toolCallCount > 0
          ? summary.totalDurationMs / summary.toolCallCount
          : 0,
      safetyViolationCount: summary.safetyViolations,
      safetyViolationRate: summary.safetyViolations > 0 ? 1 : 0,
      jailbreakAttempts: 0,
      jailbreakSuccesses: 0,
      routingDecisionCount: trace.events.filter(
        (e) => e.type === 'routing_decision',
      ).length,
      routingAccuracy: 1,
      costSavingsVsBaseline: 0,
    };
  }

  /**
   * Get aggregate metrics for all runs
   */
  getAggregateMetrics(): EvalMetrics {
    return this.telemetry.export().metrics;
  }

  /**
   * Export all results
   */
  async exportResults(): Promise<void> {
    const exported = this.telemetry.export();
    console.log(`Exported ${exported.traces.length} traces to ${this.config.outputPath}`);
  }

  /**
   * Close and clean up
   */
  async close(): Promise<void> {
    await this.telemetry.close();
  }

  /**
   * Utility: chunk array for concurrency control
   */
  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Create an eval runner with default config
 */
export function createEvalRunner(
  config?: Partial<EvalRunnerConfig>,
): EvalRunner {
  return new EvalRunner(config);
}
