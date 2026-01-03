import { SimulationRunResult } from './report.js';

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

    const mustPassFailures = proposedSecurity.some((run) =>
      run.deltas.scenarios.some((delta) => this.thresholds.mustPassScenarioIds.includes(delta.id)),
    );

    if (mustPassFailures) {
      return {
        decision: 'reject' as const,
        rationale: 'Must-pass scenarios regressed under proposed policy.',
        thresholds: this.thresholds,
      };
    }

    const falsePositiveSignals = proposedSecurity.flatMap((run) =>
      run.deltas.scenarios.filter(
        (delta) => delta.previousOutcome === 'allow' && delta.currentOutcome === 'deny',
      ),
    );

    const securityPositiveSignals = proposedSecurity.flatMap((run) =>
      run.deltas.scenarios.filter(
        (delta) => delta.previousOutcome === 'deny' && delta.currentOutcome !== 'deny',
      ),
    );

    const totalScenarios = proposedSecurity.length;
    const falsePositiveRate = totalScenarios ? falsePositiveSignals.length / totalScenarios : 0;

    if (falsePositiveRate > this.thresholds.maxFalsePositiveDelta) {
      return {
        decision: 'reject' as const,
        rationale: `False-positive rate ${falsePositiveRate.toFixed(
          3,
        )} exceeds threshold ${this.thresholds.maxFalsePositiveDelta}.`,
        thresholds: this.thresholds,
      };
    }

    const outcomeFlips = proposedSecurity.reduce(
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
