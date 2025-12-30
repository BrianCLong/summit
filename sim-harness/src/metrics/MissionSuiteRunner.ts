import * as fs from 'fs';
import * as path from 'path';
import {
  AggregatedMetrics,
  GraphSize,
  HarnessConfig,
  ScenarioData,
  ScenarioType,
  SessionMetrics,
  Workflow,
  WorkflowStep,
} from '../types/index.js';
import { ScenarioGenerator } from '../generators/ScenarioGenerator.js';
import { GhostAnalyst } from '../drivers/GhostAnalyst.js';
import { MetricsCollector } from './MetricsCollector.js';
import { Logger } from '../utils/Logger.js';

export interface MissionScenario {
  name: string;
  scenario: ScenarioType;
  size?: GraphSize;
  noise?: number;
}

export interface MissionSuiteDefinition {
  name: string;
  description: string;
  scenarios: MissionScenario[];
  thresholds: {
    maxLatencyRegressionPct: number;
    maxSuccessDropPct: number;
    maxFalseLinkRate: number;
    minCitationCorrectness: number;
    maxLeakageIncidents: number;
  };
}

export interface MissionSuiteResult {
  suite: MissionSuiteDefinition;
  runs: SessionMetrics[];
  aggregated: AggregatedMetrics;
  baseline?: AggregatedMetrics;
  regressions: string[];
  improvements: string[];
  reportPath?: string;
}

export interface MissionSuiteRunOptions {
  outputDir?: string;
  baselineMetricsPath?: string;
  label?: string;
  scenarioExecutor?: (mission: MissionScenario) => Promise<SessionMetrics>;
}

const DEFAULT_SUITES: MissionSuiteDefinition[] = [
  {
    name: 'investigation-quality',
    description:
      'End-to-end analyst workflow coverage with completion, correctness, and latency benchmarks.',
    scenarios: [
      { name: 'Fraud completion', scenario: 'fraud-ring', size: 'medium', noise: 0.1 },
      { name: 'Terror intel', scenario: 'terror-cell', size: 'medium', noise: 0.15 },
      { name: 'Corruption graph', scenario: 'corruption-network', size: 'large', noise: 0.2 },
    ],
    thresholds: {
      maxLatencyRegressionPct: 0.1,
      maxSuccessDropPct: 0.05,
      maxFalseLinkRate: 0.05,
      minCitationCorrectness: 0.9,
      maxLeakageIncidents: 0,
    },
  },
  {
    name: 'resilience-latency',
    description: 'Stress scenarios emphasizing p95 latency and data hygiene.',
    scenarios: [
      { name: 'Supply chain surge', scenario: 'supply-chain', size: 'large', noise: 0.25 },
      { name: 'Laundering spike', scenario: 'money-laundering', size: 'large', noise: 0.3 },
    ],
    thresholds: {
      maxLatencyRegressionPct: 0.15,
      maxSuccessDropPct: 0.07,
      maxFalseLinkRate: 0.08,
      minCitationCorrectness: 0.85,
      maxLeakageIncidents: 0,
    },
  },
];

export class MissionSuiteRunner {
  private generator: ScenarioGenerator;
  private analyst: GhostAnalyst;
  private logger: Logger;

  constructor(private config: HarnessConfig) {
    this.generator = new ScenarioGenerator();
    this.analyst = new GhostAnalyst(config);
    this.logger = new Logger('MissionSuiteRunner');
  }

  async runSuite(
    suiteName: string,
    options: MissionSuiteRunOptions = {}
  ): Promise<MissionSuiteResult> {
    const suite = DEFAULT_SUITES.find((definition) => definition.name === suiteName);
    if (!suite) {
      throw new Error(`Mission suite not found: ${suiteName}`);
    }

    const runs: SessionMetrics[] = [];

    for (const mission of suite.scenarios) {
      const metrics = options.scenarioExecutor
        ? await options.scenarioExecutor(mission)
        : await this.executeScenario(mission);
      runs.push(metrics);
    }

    const aggregated = this.aggregate(runs);
    const baseline = options.baselineMetricsPath
      ? this.loadBaseline(options.baselineMetricsPath)
      : undefined;

    const { regressions, improvements } = this.detectRegressions(
      aggregated,
      baseline,
      suite.thresholds
    );

    const reportPath = this.persistSuiteResult(
      suite,
      runs,
      aggregated,
      options.outputDir,
      options.label || 'candidate'
    );

    return { suite, runs, aggregated, baseline, regressions, improvements, reportPath };
  }

  private async executeScenario(mission: MissionScenario): Promise<SessionMetrics> {
    const params = {
      type: mission.scenario,
      size: mission.size || this.config.scenarios.defaultSize,
      noiseLevel: mission.noise ?? this.config.scenarios.defaultNoise,
      missingDataRate: 0.05,
      conflictingEvidenceRate: 0.05,
      seed: this.config.scenarios.seed,
    } as const;

    const scenarioData: ScenarioData = await this.generator.generate(params);
    const workflow = this.buildDefaultWorkflow(scenarioData);

    const session = await this.analyst.runWorkflow(workflow, scenarioData);
    return session.metrics;
  }

  private buildDefaultWorkflow(scenarioData: ScenarioData): Workflow {
    const steps: WorkflowStep[] = [
      { type: 'CREATE_INVESTIGATION', params: {} },
    ];

    scenarioData.entities.forEach((_, index) => {
      steps.push({ type: 'ADD_ENTITY', params: { entityIndex: index } });
    });

    scenarioData.relationships.forEach((_, index) => {
      steps.push({ type: 'ADD_RELATIONSHIP', params: { relationshipIndex: index } });
    });

    steps.push(
      { type: 'QUERY_ENTITIES', params: {} },
      { type: 'QUERY_RELATIONSHIPS', params: {} },
      { type: 'RUN_COPILOT', params: { goal: scenarioData.copilotGoal } },
      { type: 'EXPORT_DATA', params: {} }
    );

    return {
      name: `Mission Suite Workflow for ${scenarioData.investigation.name}`,
      description: 'Mission suite workflow auto-generated for regression tracking.',
      strategy: 'systematic',
      steps,
    };
  }

  private aggregate(runs: SessionMetrics[]): AggregatedMetrics {
    const collector = new MetricsCollector();
    return collector.aggregateMetrics(runs);
  }

  private loadBaseline(filepath: string): AggregatedMetrics | undefined {
    if (!fs.existsSync(filepath)) {
      this.logger.warn(`Baseline metrics file not found: ${filepath}`);
      return undefined;
    }

    const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    if (content.aggregated) {
      return content.aggregated as AggregatedMetrics;
    }

    if (content.completedSessions) {
      const collector = new MetricsCollector();
      return collector.aggregateMetrics(content.completedSessions as SessionMetrics[]);
    }

    this.logger.warn(`Baseline metrics file did not contain known structure: ${filepath}`);
    return undefined;
  }

  private detectRegressions(
    candidate: AggregatedMetrics,
    baseline: AggregatedMetrics | undefined,
    thresholds: MissionSuiteDefinition['thresholds']
  ): { regressions: string[]; improvements: string[] } {
    if (!baseline) {
      return { regressions: [], improvements: ['No baseline provided; recording candidate metrics.'] };
    }

    const regressions: string[] = [];
    const improvements: string[] = [];

    const successDelta = candidate.averageSuccessRate - baseline.averageSuccessRate;
    if (successDelta < -thresholds.maxSuccessDropPct) {
      regressions.push(
        `Investigation completion rate dropped by ${(successDelta * 100).toFixed(2)}% (threshold ${
          thresholds.maxSuccessDropPct * 100
        }%)`
      );
    } else if (successDelta > 0) {
      improvements.push(
        `Investigation completion rate improved by ${(successDelta * 100).toFixed(2)}%`
      );
    }

    const latencyDelta = (candidate.p95Latency || 0) - (baseline.p95Latency || 0);
    if (baseline.p95Latency && latencyDelta > baseline.p95Latency * thresholds.maxLatencyRegressionPct) {
      regressions.push(
        `p95 latency regressed by ${latencyDelta.toFixed(2)}ms (threshold ${(thresholds.maxLatencyRegressionPct * 100).toFixed(1)}%)`
      );
    }

    if ((candidate.averageCitationCorrectness || 1) < thresholds.minCitationCorrectness) {
      regressions.push(
        `Citation correctness below target: ${(candidate.averageCitationCorrectness || 0).toFixed(2)} < ${thresholds.minCitationCorrectness}`
      );
    }

    if ((candidate.averageFalseLinkRate || 0) > thresholds.maxFalseLinkRate) {
      regressions.push(
        `False-link rate exceeds limit: ${(candidate.averageFalseLinkRate || 0).toFixed(3)} > ${thresholds.maxFalseLinkRate}`
      );
    }

    if ((candidate.averageLeakageIncidents || 0) > thresholds.maxLeakageIncidents) {
      regressions.push(
        `Leakage findings detected: ${(candidate.averageLeakageIncidents || 0).toFixed(0)} incidents`
      );
    }

    return { regressions, improvements };
  }

  private persistSuiteResult(
    suite: MissionSuiteDefinition,
    runs: SessionMetrics[],
    aggregated: AggregatedMetrics,
    outputDir: string | undefined,
    label: string
  ): string | undefined {
    const targetDir = outputDir || path.join(process.cwd(), 'reports');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const payload = {
      suite: suite.name,
      generatedAt: new Date().toISOString(),
      runs,
      aggregated,
      label,
    };

    const filename = path.join(targetDir, `${suite.name}-${label}-metrics.json`);
    fs.writeFileSync(filename, JSON.stringify(payload, null, 2), 'utf8');
    this.logger.info(`Mission suite metrics saved to ${filename}`);
    return filename;
  }
}
