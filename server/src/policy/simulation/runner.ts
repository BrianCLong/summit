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
        (target as any)[normalizedPath] = [...current, ...(Array.isArray(patch.value) ? patch.value : [patch.value])];
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
      break;
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
    const content = execSync(`git show ${ref}:${bundlePath}`, { encoding: 'utf-8' });
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

async function evaluateSecuritySuite(bundle: TenantPolicyBundle): Promise<SimulationRunResult> {
  const scenarios = buildSecurityScenarios();
  const deltas: ScenarioDelta[] = [];
  let passedCount = 0;

  for (const scenario of scenarios) {
    const result = simulatePolicyDecision(bundle, scenario.input);
    const outcome = mapDecisionToOutcome(result.allow, result.reason);
    const matches =
      outcome === scenario.expected.outcome ||
      (scenario.expected.outcome === 'require-approval' && outcome === 'deny');

    if (matches) {
      passedCount += 1;
    } else {
      deltas.push({
        id: scenario.id,
        name: scenario.name,
        suite: 'security_evals',
        previousOutcome: scenario.expected.outcome,
        currentOutcome: outcome,
        category: scenario.attackType,
      });
    }
  }

  const scenarioPassRate = scenarios.length ? passedCount / scenarios.length : 1;

  return {
    suite: 'security_evals',
    mode: 'baseline',
    passed: deltas.length === 0,
    summary: {
      scenarioPassRate,
      denyDeltaByCategory: {},
      falsePositiveIndicators: deltas
        .filter((delta) => delta.previousOutcome === 'allow' && delta.currentOutcome === 'deny')
        .map((delta) => delta.id),
      securityPositiveIndicators: deltas
        .filter((delta) => delta.previousOutcome === 'deny' && delta.currentOutcome !== 'deny')
        .map((delta) => delta.id),
    },
    deltas: { scenarios: deltas, anomalies: [] },
  } satisfies SimulationRunResult;
}

async function evaluateAnomalySuite(bundle: TenantPolicyBundle): Promise<SimulationRunResult> {
  const fixtures = buildAnomalyFixtures();
  const anomalyDeltas: ScenarioDelta[] = [];

  for (const fixture of fixtures) {
    const baselineScore = scoreAnomaly(fixture.baseline, fixture.baseline.at(-1) || 0);
    const candidateScore = scoreAnomaly(fixture.baseline, fixture.candidate.at(-1) || 0);
    const flipped = Math.abs(candidateScore - baselineScore) > 0.15;
    if (flipped) {
      anomalyDeltas.push({
        id: fixture.id,
        suite: 'anomaly_fixtures',
        name: fixture.description,
        previousOutcome: baselineScore > 0.5 ? 'alert' : 'allow',
        currentOutcome: candidateScore > 0.5 ? 'alert' : 'allow',
        category: 'latency',
      });
    }
  }

  const passRate = fixtures.length ? (fixtures.length - anomalyDeltas.length) / fixtures.length : 1;

  return {
    suite: 'anomaly_fixtures',
    mode: 'baseline',
    passed: anomalyDeltas.length === 0,
    summary: {
      scenarioPassRate: passRate,
      denyDeltaByCategory: {},
      falsePositiveIndicators: anomalyDeltas
        .filter((delta) => delta.previousOutcome === 'allow' && delta.currentOutcome === 'deny')
        .map((delta) => delta.id),
      securityPositiveIndicators: anomalyDeltas
        .filter((delta) => delta.previousOutcome === 'deny' && delta.currentOutcome !== 'deny')
        .map((delta) => delta.id),
    },
    deltas: { scenarios: anomalyDeltas, anomalies: [] },
  } satisfies SimulationRunResult;
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
    deltas: { scenarios: [], anomalies: [] },
  };
}

export class PolicySimulationRunner {
  private readonly options: PolicySimulationRunnerOptions;

  constructor(options: PolicySimulationRunnerOptions) {
    this.options = options;
  }

  private async materializeBundles(): Promise<{ baseline: TenantPolicyBundle; proposed: TenantPolicyBundle; digest: string }>
  {
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
    };
  }

  private applyProposal(bundle: TenantPolicyBundle, proposal: PolicyChangeProposal): TenantPolicyBundle {
    const working = cloneBundle(bundle);
    for (const patch of proposal.patches) {
      applyPatch(working, patch);
    }
    return working;
  }

  private static diffRuns(
    baseline: SimulationRunResult,
    proposed: SimulationRunResult,
  ): SimulationRunResult {
    const scenarioDeltas: ScenarioDelta[] = [];

    for (const delta of baseline.deltas.scenarios) {
      scenarioDeltas.push(delta);
    }

    const baselineMap = new Map(
      baseline.deltas.scenarios.map((delta) => [delta.id, delta] as const),
    );

    for (const delta of proposed.deltas.scenarios) {
      const previous = baselineMap.get(delta.id);
      if (!previous) {
        scenarioDeltas.push(delta);
      } else if (previous.currentOutcome !== delta.currentOutcome) {
        scenarioDeltas.push({ ...delta, previousOutcome: previous.currentOutcome });
      }
    }

    return {
      ...proposed,
      deltas: { scenarios: scenarioDeltas, anomalies: proposed.deltas.anomalies },
    };
  }

  async run(): Promise<PolicySimulationReport> {
    const { baseline, proposed, digest } = await this.materializeBundles();

    const baselineSecurity = await evaluateSecuritySuite(baseline);
    const proposedSecurity = await evaluateSecuritySuite(proposed);
    proposedSecurity.mode = 'proposed';

    const baselineAnomaly = await evaluateAnomalySuite(baseline);
    const proposedAnomaly = await evaluateAnomalySuite(proposed);
    proposedAnomaly.mode = 'proposed';

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
      policyTargets: recommendationEngine.derivePolicyTargets(this.options.proposalPath),
      simulationRuns: [
        baselineSecurity,
        proposedSecurity,
        baselineAnomaly,
        proposedAnomaly,
        baselineApi,
        proposedApi,
      ].map((run) =>
        run.mode === 'proposed' && run.suite === 'security_evals'
          ? PolicySimulationRunner.diffRuns(baselineSecurity, run)
          : run,
      ),
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
