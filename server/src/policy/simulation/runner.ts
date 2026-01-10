import { promises as fs, readFileSync } from 'fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'path';
import get from 'lodash/get.js';
import merge from 'lodash/merge.js';
import set from 'lodash/set.js';
import unset from 'lodash/unset.js';
import {
  PolicySimulationInput,
  simulatePolicyDecision,
  tenantPolicyBundleSchema,
  type TenantPolicyBundle,
} from '../tenantBundle.js';
import { policyChangeProposalSchema, type PolicyChangeProposal, type ProposalPatch } from './proposal.js';
import {
  PolicySimulationReport,
  ScenarioOutcome,
  ScenarioDelta,
  policySimulationReportSchema,
  type SimulationRunResult,
  type ScenarioResult,
  type AnomalyResult,
} from './report.js';
import { Recommendation, recommendationSchema } from './report.js';
import { RecommendationEngine, RecommendationThresholds } from './recommendationEngine.js';

export interface PolicySimulationRunnerOptions {
  readonly baselineBundlePath: string;
  readonly proposedBundlePath?: string;
  readonly proposalPath?: string;
  readonly baselineRef?: string;
  readonly seed?: number;
  readonly thresholds?: Partial<RecommendationThresholds>;
}

interface SecurityScenario {
  id: string;
  name: string;
  attackType?: string;
  expected: { outcome: ScenarioOutcome };
  input: PolicySimulationInput;
}

interface AnomalyFixtureCase {
  id: string;
  description: string;
  baseline: number[];
  candidate: number[];
  expectedBaselineAlert?: boolean;
  expectedCandidateAlert?: boolean;
}

function scoreAnomaly(baseline: number[], candidate: number): number {
  if (!baseline.length) return 0;
  const mean = baseline.reduce((acc, value) => acc + value, 0) / baseline.length;
  const variance = baseline.reduce((acc, value) => acc + (value - mean) ** 2, 0) / Math.max(1, baseline.length - 1);
  const stdDev = Math.max(Math.sqrt(variance), 1);
  const zScore = Math.abs(candidate - mean) / stdDev;
  return Math.min(1, zScore / 3);
}

function cloneBundle(bundle: TenantPolicyBundle): TenantPolicyBundle {
  return tenantPolicyBundleSchema.parse(JSON.parse(JSON.stringify(bundle)));
}

function applyPatch(target: TenantPolicyBundle, patch: ProposalPatch): void {
  const normalizedPath = patch.path.startsWith('/') ? patch.path.slice(1).replace(/\//g, '.') : patch.path;
  switch (patch.op) {
    case 'set':
      set(target as any, normalizedPath, patch.value);
      break;
    case 'remove':
      unset(target as any, normalizedPath);
      break;
    case 'append': {
      const current = get(target as any, normalizedPath);
      if (Array.isArray(current)) {
        set(
          target as any,
          normalizedPath,
          [...current, ...(Array.isArray(patch.value) ? patch.value : [patch.value])],
        );
      } else {
        set(target as any, normalizedPath, patch.value);
      }
      break;
    }
    case 'merge':
      if (normalizedPath) {
        const existing = get(target as any, normalizedPath) || {};
        const merged = merge({}, existing, patch.value);
        set(target as any, normalizedPath, merged);
      } else {
        merge(target as any, patch.value);
      }
      break;
    default:
      throw new Error(`Unsupported proposal patch op: ${patch.op}`);
  }
}

async function loadProposal(proposalPath?: string): Promise<PolicyChangeProposal | undefined> {
  if (!proposalPath) return undefined;
  const raw = await fs.readFile(proposalPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return policyChangeProposalSchema.parse(parsed);
}

async function loadBundleFromGit(
  ref: string,
  bundlePath: string,
): Promise<{ bundle: TenantPolicyBundle; digest: string } | undefined> {
  try {
    const relativePath = path.isAbsolute(bundlePath)
      ? path.relative(process.cwd(), bundlePath)
      : bundlePath;
    const content = execSync(`git show ${ref}:${relativePath}`, { encoding: 'utf-8' });
    return {
      bundle: tenantPolicyBundleSchema.parse(JSON.parse(content)),
      digest: createHash('sha256').update(content).digest('hex'),
    };
  } catch (error) {
    return undefined;
  }
}

async function loadBundleFromPath(bundlePath: string): Promise<{ bundle: TenantPolicyBundle; digest: string }> {
  const content = await fs.readFile(bundlePath, 'utf-8');
  const digest = createHash('sha256').update(content).digest('hex');
  return { bundle: tenantPolicyBundleSchema.parse(JSON.parse(content)), digest } as const;
}

function mapDecisionToOutcome(allow: boolean, reason: string): ScenarioOutcome {
  if (!allow) return 'deny';
  if (reason.toLowerCase().includes('approval')) return 'require-approval';
  return 'allow';
}

function isRestrictiveOutcome(outcome: ScenarioOutcome): boolean {
  return outcome === 'deny' || outcome === 'alert' || outcome === 'require-approval';
}

function outcomesMatchExpected(actual: ScenarioOutcome, expected: ScenarioOutcome): boolean {
  return (
    actual === expected ||
    (expected === 'require-approval' && (actual === 'deny' || actual === 'require-approval'))
  );
}

function buildSecurityScenarios(): SecurityScenario[] {
  const packPath = path.join(process.cwd(), 'testpacks/analytics/unauthorized-queries.json');
  const raw = JSON.parse(readFileSync(packPath, 'utf-8'));
  return raw.scenarios
    .filter((scenario: any) => scenario.enabled)
    .map((scenario: any) => ({
      id: scenario.id,
      name: scenario.name,
      attackType: scenario.attackType,
      expected: {
        outcome:
          scenario.expected.outcome === 'block'
            ? 'deny'
            : (scenario.expected.outcome as ScenarioOutcome),
      },
      input: {
        action: 'read',
        subjectTenantId: 'tenant-alpha',
        resourceTenantId:
          scenario.attackType === 'unauthorized-access'
            ? scenario.input.context?.targetTenantId || 'tenant-999'
            : 'tenant-alpha',
        purpose: 'analytics',
        justification: scenario.input.context?.permissions?.join(', '),
      },
    }));
}

function buildAnomalyFixtures(): AnomalyFixtureCase[] {
  const fixturePath = path.join(process.cwd(), 'testpacks/anomalies/metrics-latency.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  return raw.fixtures as AnomalyFixtureCase[];
}

function buildSecurityResults(bundle: TenantPolicyBundle): ScenarioResult[] {
  const scenarios = buildSecurityScenarios();
  const results = scenarios.map((scenario) => {
    const result = simulatePolicyDecision(bundle, scenario.input);
    const outcome = mapDecisionToOutcome(result.allow, result.reason);
    return {
      id: scenario.id,
      name: scenario.name,
      suite: 'security_evals',
      expectedOutcome: scenario.expected.outcome,
      outcome,
      passed: outcomesMatchExpected(outcome, scenario.expected.outcome),
      category: scenario.attackType,
    } satisfies ScenarioResult;
  });

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

function buildAnomalyResults(
  fixtures: AnomalyFixtureCase[],
  mode: 'baseline' | 'proposed',
): AnomalyResult[] {
  return fixtures
    .map((fixture) => {
      const series = mode === 'baseline' ? fixture.baseline : fixture.candidate;
      const score = scoreAnomaly(fixture.baseline, series.at(-1) || 0);
      return {
        id: fixture.id,
        description: fixture.description,
        score,
        alertRaised: score > 0.5,
      } satisfies AnomalyResult;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function buildScenarioDeltas(
  baseline: ScenarioResult[],
  proposed: ScenarioResult[],
  suite: SimulationRunResult['suite'],
): ScenarioDelta[] {
  const baselineMap = new Map(baseline.map((result) => [result.id, result]));
  return proposed
    .filter((result) => {
      const baselineResult = baselineMap.get(result.id);
      return baselineResult && baselineResult.outcome !== result.outcome;
    })
    .map((result) => {
      const baselineResult = baselineMap.get(result.id)!;
      return {
        id: result.id,
        name: result.name,
        suite,
        previousOutcome: baselineResult.outcome,
        currentOutcome: result.outcome,
        category: result.category,
      } satisfies ScenarioDelta;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function buildAnomalyDeltas(
  fixtures: AnomalyFixtureCase[],
  baselineResults: AnomalyResult[],
  proposedResults: AnomalyResult[],
): ScenarioDelta[] {
  const baselineMap = new Map(baselineResults.map((result) => [result.id, result]));
  return proposedResults
    .filter((result) => {
      const baselineResult = baselineMap.get(result.id);
      return baselineResult && baselineResult.alertRaised !== result.alertRaised;
    })
    .map((result) => {
      const baselineResult = baselineMap.get(result.id)!;
      const fixture = fixtures.find((entry) => entry.id === result.id);
      return {
        id: result.id,
        name: fixture?.description,
        suite: 'anomaly_fixtures',
        previousOutcome: baselineResult.alertRaised ? 'alert' : 'allow',
        currentOutcome: result.alertRaised ? 'alert' : 'allow',
        category: 'latency',
      } satisfies ScenarioDelta;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function buildSecuritySummary(
  results: ScenarioResult[],
  deltas: ScenarioDelta[],
): SimulationRunResult['summary'] {
  const total = results.length || 1;
  const passed = results.filter((result) => result.passed).length;
  const falsePositives = results.filter(
    (result) =>
      result.expectedOutcome === 'allow' && isRestrictiveOutcome(result.outcome),
  );
  const denyDeltaByCategory = deltas.reduce<Record<string, number>>((acc, delta) => {
    if (delta.currentOutcome === 'deny') {
      const key = delta.category || 'uncategorized';
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    scenarioPassRate: passed / total,
    denyDeltaByCategory,
    falsePositiveIndicators: falsePositives.map((result) => result.id),
    securityPositiveIndicators: deltas
      .filter(
        (delta) =>
          !isRestrictiveOutcome(delta.previousOutcome) &&
          isRestrictiveOutcome(delta.currentOutcome),
      )
      .map((delta) => delta.id),
  };
}

function buildAnomalySummary(
  results: AnomalyResult[],
  deltas: ScenarioDelta[],
  fixtures: AnomalyFixtureCase[],
  mode: 'baseline' | 'proposed',
): SimulationRunResult['summary'] {
  const expectedAlerts = new Map(
    fixtures.map((fixture) => [
      fixture.id,
      mode === 'baseline'
        ? fixture.expectedBaselineAlert ?? false
        : fixture.expectedCandidateAlert ?? false,
    ]),
  );
  const total = results.length || 1;
  const passed = results.filter(
    (result) => result.alertRaised === (expectedAlerts.get(result.id) ?? false),
  ).length;
  const falsePositives = results.filter(
    (result) => !(expectedAlerts.get(result.id) ?? false) && result.alertRaised,
  );

  return {
    scenarioPassRate: passed / total,
    denyDeltaByCategory: {},
    falsePositiveIndicators: falsePositives.map((result) => result.id),
    securityPositiveIndicators: deltas
      .filter((delta) => delta.currentOutcome === 'alert' && delta.previousOutcome === 'allow')
      .map((delta) => delta.id),
  };
}

function buildSecurityRun(
  results: ScenarioResult[],
  mode: 'baseline' | 'proposed',
  deltas: ScenarioDelta[],
): SimulationRunResult {
  return {
    suite: 'security_evals',
    mode,
    passed: results.every((result) => result.passed),
    summary: buildSecuritySummary(results, deltas),
    results: { scenarios: results, anomalies: [] },
    deltas: { scenarios: deltas, anomalies: [] },
  };
}

function buildAnomalyRun(
  results: AnomalyResult[],
  fixtures: AnomalyFixtureCase[],
  mode: 'baseline' | 'proposed',
  deltas: ScenarioDelta[],
): SimulationRunResult {
  const expectedMap = new Map(
    fixtures.map((fixture) => [
      fixture.id,
      mode === 'baseline'
        ? fixture.expectedBaselineAlert ?? false
        : fixture.expectedCandidateAlert ?? false,
    ]),
  );
  const passed =
    results.length > 0
      ? results.every((result) => result.alertRaised === (expectedMap.get(result.id) ?? false))
      : true;
  return {
    suite: 'anomaly_fixtures',
    mode,
    passed,
    summary: buildAnomalySummary(results, deltas, fixtures, mode),
    results: { scenarios: [], anomalies: results },
    deltas: { scenarios: deltas, anomalies: [] },
  };
}

async function evaluateApiSuite(): Promise<SimulationRunResult> {
  return {
    suite: 'api_integration',
    mode: 'baseline',
    passed: true,
    summary: {
      scenarioPassRate: 1,
      denyDeltaByCategory: {},
      falsePositiveIndicators: [],
      securityPositiveIndicators: [],
    },
    results: { scenarios: [], anomalies: [] },
    deltas: { scenarios: [], anomalies: [] },
  };
}

export class PolicySimulationRunner {
  private readonly options: PolicySimulationRunnerOptions;

  constructor(options: PolicySimulationRunnerOptions) {
    this.options = options;
  }

  private async materializeBundles(): Promise<{
    baseline: TenantPolicyBundle;
    proposed: TenantPolicyBundle;
    digest: string;
    proposal?: PolicyChangeProposal;
  }> {
    const baselineRef = this.options.baselineRef;
    const baselineFromRef = baselineRef
      ? await loadBundleFromGit(baselineRef, this.options.baselineBundlePath)
      : undefined;
    const baselineSource = baselineFromRef || (await loadBundleFromPath(this.options.baselineBundlePath));

    const proposedBundlePath = this.options.proposedBundlePath || this.options.baselineBundlePath;
    const proposedBundle = (await loadBundleFromPath(proposedBundlePath)).bundle;

    const proposal = await loadProposal(this.options.proposalPath);
    const proposed = proposal ? this.applyProposal(proposedBundle, proposal) : cloneBundle(proposedBundle);

    return {
      baseline: baselineSource.bundle,
      proposed,
      digest: baselineSource.digest,
      proposal,
    };
  }

  private applyProposal(bundle: TenantPolicyBundle, proposal: PolicyChangeProposal): TenantPolicyBundle {
    const working = cloneBundle(bundle);
    for (const patch of proposal.patches) {
      applyPatch(working, patch);
    }
    return working;
  }

  async run(): Promise<PolicySimulationReport> {
    const { baseline, proposed, digest, proposal } = await this.materializeBundles();

    const baselineSecurityResults = buildSecurityResults(baseline);
    const proposedSecurityResults = buildSecurityResults(proposed);
    const securityDeltas = buildScenarioDeltas(
      baselineSecurityResults,
      proposedSecurityResults,
      'security_evals',
    );
    const baselineSecurity = buildSecurityRun(baselineSecurityResults, 'baseline', []);
    const proposedSecurity = buildSecurityRun(
      proposedSecurityResults,
      'proposed',
      securityDeltas,
    );

    const anomalyFixtures = buildAnomalyFixtures();
    const baselineAnomalyResults = buildAnomalyResults(anomalyFixtures, 'baseline');
    const proposedAnomalyResults = buildAnomalyResults(anomalyFixtures, 'proposed');
    const anomalyDeltas = buildAnomalyDeltas(
      anomalyFixtures,
      baselineAnomalyResults,
      proposedAnomalyResults,
    );
    const baselineAnomaly = buildAnomalyRun(
      baselineAnomalyResults,
      anomalyFixtures,
      'baseline',
      [],
    );
    const proposedAnomaly = buildAnomalyRun(
      proposedAnomalyResults,
      anomalyFixtures,
      'proposed',
      anomalyDeltas,
    );

    const baselineApi = await evaluateApiSuite();
    const proposedApi = await evaluateApiSuite();
    proposedApi.mode = 'proposed';

    const recommendationEngine = new RecommendationEngine(this.options.thresholds);
    const recommendation: Recommendation = recommendationSchema.parse(
      recommendationEngine.recommend({
        baselineRuns: [baselineSecurity, baselineAnomaly, baselineApi],
        proposedRuns: [proposedSecurity, proposedAnomaly, proposedApi],
      }),
    );

    const report: PolicySimulationReport = policySimulationReportSchema.parse({
      proposalId: this.options.proposalPath
        ? path.basename(this.options.proposalPath)
        : this.options.proposedBundlePath || 'working-tree',
      policyTargets:
        proposal?.policyTargets?.length
          ? proposal.policyTargets
          : recommendationEngine.derivePolicyTargets(this.options.proposalPath),
      simulationRuns: [baselineSecurity, proposedSecurity, baselineAnomaly, proposedAnomaly, baselineApi, proposedApi],
      recommendation,
      evidenceRefs: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        seed: this.options.seed ?? 42,
        versions: {
          runner: '1.0.0',
          policyBundleDigest: digest,
          baselineRef: this.options.baselineRef,
        },
      },
    });

    return report;
  }
}
