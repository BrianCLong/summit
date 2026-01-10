import { ScenarioOutcome, SimulationRunResult } from './report.js';

export interface RecommendationThresholds {
  mustPassScenarioIds: string[];
  maxFalsePositiveDelta: number;
  maxOutcomeFlipsBeforeReview: number;
}

export interface RecommendationInput {
  baselineRuns: SimulationRunResult[];
  proposedRuns: SimulationRunResult[];
}

export class RecommendationEngine {
  private readonly thresholds: RecommendationThresholds;

  constructor(overrides?: Partial<RecommendationThresholds>) {
    this.thresholds = {
      mustPassScenarioIds: ['ANALYTICS-001', 'ANALYTICS-002'],
      maxFalsePositiveDelta: 0.05,
      maxOutcomeFlipsBeforeReview: 3,
      ...overrides,
    };
  }

  derivePolicyTargets(proposalPath?: string): string[] {
    if (!proposalPath) return [];
    const filename = proposalPath.split('/').pop();
    return filename ? [filename] : [];
  }

  recommend(input: RecommendationInput) {
    const baselineSecurity = input.baselineRuns.filter((run) => run.suite === 'security_evals');
    const proposedSecurity = input.proposedRuns.filter((run) => run.suite === 'security_evals');

    const proposedScenarioResults = proposedSecurity.flatMap((run) => run.results.scenarios);
    const mustPassFailures = this.thresholds.mustPassScenarioIds.some((id) => {
      const result = proposedScenarioResults.find((scenario) => scenario.id === id);
      return !result || !result.passed;
    });

    if (mustPassFailures) {
      return {
        decision: 'reject' as const,
        rationale: 'Must-pass scenarios regressed under proposed policy.',
        thresholds: this.thresholds,
      };
    }

    const falsePositiveSignals = proposedScenarioResults.filter(
      (scenario) =>
        scenario.expectedOutcome === 'allow' &&
        isRestrictiveOutcome(scenario.outcome),
    );

    const falsePositiveDenominator = proposedScenarioResults.filter(
      (scenario) => scenario.expectedOutcome === 'allow',
    ).length;
    const falsePositiveRate = falsePositiveDenominator
      ? falsePositiveSignals.length / falsePositiveDenominator
      : 0;

    if (falsePositiveRate > this.thresholds.maxFalsePositiveDelta) {
      return {
        decision: 'reject' as const,
        rationale: `False-positive rate ${falsePositiveRate.toFixed(
          3,
        )} exceeds threshold ${this.thresholds.maxFalsePositiveDelta}.`,
        thresholds: this.thresholds,
      };
    }

    const outcomeFlips = input.proposedRuns.reduce(
      (acc, run) => acc + (run.deltas.scenarios?.length || 0),
      0,
    );

    if (outcomeFlips > this.thresholds.maxOutcomeFlipsBeforeReview) {
      return {
        decision: 'needs_review' as const,
        rationale: `Policy changes alter ${outcomeFlips} scenario outcomes; human review required.`,
        thresholds: this.thresholds,
      };
    }

    const securityPositiveSignals = proposedSecurity.flatMap((run) =>
      run.deltas.scenarios.filter(
        (delta) =>
          !isRestrictiveOutcome(delta.previousOutcome) &&
          isRestrictiveOutcome(delta.currentOutcome),
      ),
    );

    if (securityPositiveSignals.length > 0) {
      return {
        decision: 'approve' as const,
        rationale: 'Dangerous scenarios tightened without exceeding false-positive thresholds.',
        thresholds: this.thresholds,
      };
    }

    return {
      decision: 'approve' as const,
      rationale: 'No regressions detected and thresholds respected.',
      thresholds: this.thresholds,
    };
  }
}

function isRestrictiveOutcome(outcome: ScenarioOutcome): boolean {
  return outcome === 'deny' || outcome === 'alert' || outcome === 'require-approval';
}
