import {
  HealthScorer,
  summarizeSyntheticFailures,
  withinBakeWindow,
} from './healthScorer';
import {
  AuditEvent,
  CanaryConfig,
  CanaryState,
  EvaluationOutcome,
  HealthSample,
} from './types';

const DEFAULT_STEPS = [10, 25, 50, 100];

export function buildDefaultConfig(
  service: string,
  environment: string,
): CanaryConfig {
  return {
    service,
    environment,
    steps: DEFAULT_STEPS.map((weight, index) => ({
      weight,
      minBakeTimeSeconds: index === 0 ? 900 : 1800,
    })),
    weights: {
      errorRate: 0.4,
      latency: 0.3,
      saturation: 0.2,
      probes: 0.1,
    },
    policy: {
      maxErrorRate: 0.01,
      maxLatencyP95: 350,
      maxSaturation: 0.8,
      minProbeSuccess: 0.95,
      compositePassScore: 0.7,
      consecutiveBreachLimit: 2,
    },
  };
}

export class CanaryManager {
  private readonly config: CanaryConfig;
  private readonly scorer: HealthScorer;

  constructor(config: CanaryConfig) {
    this.config = config;
    this.scorer = new HealthScorer(config.weights, config.policy);
  }

  public initialiseState(): CanaryState {
    return {
      status: 'idle',
      currentStepIndex: -1,
      breaches: 0,
      history: [],
    };
  }

  public evaluate(
    state: CanaryState,
    sample: HealthSample,
    now = new Date(),
  ): EvaluationOutcome {
    if (state.abortSignal) {
      return this.abort(
        state,
        state.abortSignal.actor,
        state.abortSignal.reason,
        now,
      );
    }
    if (state.status === 'completed' || state.status === 'rolling_back') {
      return {
        action: 'noop',
        reason: 'Rollout already finished',
        state,
        compositeScore: 1,
        sloBreaches: [],
        syntheticFailures: [],
        helmCommands: [],
      };
    }

    const nextState = { ...state };
    if (nextState.currentStepIndex === -1) {
      nextState.currentStepIndex = 0;
      nextState.status = 'running';
      nextState.stepStartedAt = now.toISOString();
      nextState.history = [
        {
          stepIndex: 0,
          startedAt: nextState.stepStartedAt,
          evaluations: [],
        },
      ];
      return {
        action: 'start_step',
        reason: `Initialising canary at ${this.currentStepWeight(nextState)}% traffic`,
        state: nextState,
        compositeScore: 1,
        sloBreaches: [],
        syntheticFailures: [],
        helmCommands: [
          this.buildHelmCommand(this.currentStepWeight(nextState)),
        ],
      };
    }

    const step = this.config.steps[nextState.currentStepIndex];
    const evaluation = this.scorer.evaluate(sample);
    const syntheticFailures = summarizeSyntheticFailures(sample);
    const sloBreaches = evaluation.sloBreaches;
    const historyEntry = nextState.history.find(
      (item) => item.stepIndex === nextState.currentStepIndex,
    );
    if (historyEntry) {
      historyEntry.evaluations.push({
        collectedAt: sample.collectedAt,
        compositeScore: evaluation.compositeScore,
        componentScores: evaluation.componentScores,
        sloBreaches,
        syntheticFailures,
      });
    }

    if (sloBreaches.length || syntheticFailures.length) {
      nextState.breaches += 1;
    } else {
      nextState.breaches = 0;
    }

    if (nextState.breaches >= this.config.policy.consecutiveBreachLimit) {
      return this.rollback(
        nextState,
        evaluation.compositeScore,
        sloBreaches,
        syntheticFailures,
        {
          actor: 'auto-controller',
          action: 'rollback',
          reason:
            sloBreaches[0] ??
            syntheticFailures[0] ??
            'Composite score under threshold',
          timestamp: now.toISOString(),
          metadata: {
            stepIndex: nextState.currentStepIndex,
            score: evaluation.compositeScore,
            trafficWeight: step.weight,
            environment: this.config.environment,
          },
        },
      );
    }

    if (evaluation.compositeScore < this.config.policy.compositePassScore) {
      nextState.status = 'holding';
      return {
        action: 'hold',
        reason: `Composite score ${evaluation.compositeScore.toFixed(2)} below threshold ${this.config.policy.compositePassScore.toFixed(2)}`,
        state: nextState,
        compositeScore: evaluation.compositeScore,
        sloBreaches,
        syntheticFailures,
        helmCommands: [],
      };
    }

    if (
      !withinBakeWindow(nextState.stepStartedAt, step.minBakeTimeSeconds, now)
    ) {
      nextState.status = 'running';
      return {
        action: 'hold',
        reason: `Bake window ${step.minBakeTimeSeconds}s not yet satisfied`,
        state: nextState,
        compositeScore: evaluation.compositeScore,
        sloBreaches,
        syntheticFailures,
        helmCommands: [],
      };
    }

    if (nextState.currentStepIndex === this.config.steps.length - 1) {
      nextState.status = 'completed';
      return {
        action: 'complete',
        reason: 'Canary rollout finished successfully',
        state: nextState,
        compositeScore: evaluation.compositeScore,
        sloBreaches,
        syntheticFailures,
        helmCommands: [this.buildHelmPromotionCommand()],
        auditEvent: {
          actor: 'auto-controller',
          action: 'canary_completed',
          reason: 'Composite score healthy across all steps',
          timestamp: now.toISOString(),
          metadata: {
            finalScore: evaluation.compositeScore,
            environment: this.config.environment,
          },
        },
      };
    }

    nextState.currentStepIndex += 1;
    nextState.status = 'running';
    nextState.stepStartedAt = now.toISOString();
    nextState.history.push({
      stepIndex: nextState.currentStepIndex,
      startedAt: nextState.stepStartedAt,
      evaluations: [],
    });

    return {
      action: 'promote',
      reason: `Promoting canary to ${this.currentStepWeight(nextState)}% traffic`,
      state: nextState,
      compositeScore: evaluation.compositeScore,
      sloBreaches,
      syntheticFailures,
      helmCommands: [this.buildHelmCommand(this.currentStepWeight(nextState))],
      auditEvent: {
        actor: 'auto-controller',
        action: 'promote_step',
        reason: 'Composite score above threshold and bake window satisfied',
        timestamp: now.toISOString(),
        metadata: {
          stepIndex: nextState.currentStepIndex,
          trafficWeight: this.currentStepWeight(nextState),
          score: evaluation.compositeScore,
          environment: this.config.environment,
        },
      },
    };
  }

  public requestAbort(
    state: CanaryState,
    actor: string,
    reason: string,
  ): CanaryState {
    return {
      ...state,
      abortSignal: {
        actor,
        reason,
        at: new Date().toISOString(),
      },
    };
  }

  public abort(
    state: CanaryState,
    actor: string,
    reason: string,
    now = new Date(),
  ): EvaluationOutcome {
    const abortedState: CanaryState = {
      ...state,
      status: 'aborted',
    };
    return {
      action: 'abort',
      reason,
      state: abortedState,
      compositeScore: 0,
      sloBreaches: [],
      syntheticFailures: [],
      helmCommands: [this.buildHelmRollbackCommand()],
      auditEvent: {
        actor,
        action: 'canary_aborted',
        reason,
        timestamp: now.toISOString(),
        metadata: {
          stepIndex: state.currentStepIndex,
          environment: this.config.environment,
        },
      },
    };
  }

  private rollback(
    state: CanaryState,
    compositeScore: number,
    sloBreaches: string[],
    syntheticFailures: string[],
    auditEvent: AuditEvent,
  ): EvaluationOutcome {
    const rollbackState: CanaryState = {
      ...state,
      status: 'rolling_back',
    };

    return {
      action: 'rollback',
      reason: auditEvent.reason,
      state: rollbackState,
      compositeScore,
      sloBreaches,
      syntheticFailures,
      helmCommands: [this.buildHelmRollbackCommand()],
      auditEvent,
    };
  }

  private buildHelmCommand(weight: number): string {
    const releaseName = `${this.config.service}-${this.config.environment}`;
    return `helm upgrade ${releaseName} charts/${this.config.service} --set traffic.canary=${weight} --set traffic.stable=${100 - weight}`;
  }

  private buildHelmPromotionCommand(): string {
    const releaseName = `${this.config.service}-${this.config.environment}`;
    return `helm upgrade ${releaseName} charts/${this.config.service} --set traffic.canary=100 --set traffic.stable=0`;
  }

  private buildHelmRollbackCommand(): string {
    const releaseName = `${this.config.service}-${this.config.environment}`;
    return `helm rollback ${releaseName} --cleanup-on-fail`;
  }

  private currentStepWeight(state: CanaryState): number {
    if (state.currentStepIndex < 0) {
      return this.config.steps[0]?.weight ?? DEFAULT_STEPS[0];
    }
    return (
      this.config.steps[state.currentStepIndex]?.weight ?? DEFAULT_STEPS.at(-1)!
    );
  }
}

export function meanTimeToRollback(
  history: CanaryState,
  now = new Date(),
): number | undefined {
  const lastHistory = history.history.at(-1);
  if (!lastHistory) {
    return undefined;
  }
  const lastEvaluation = lastHistory.evaluations.at(-1);
  if (!lastEvaluation) {
    return undefined;
  }
  const breachIndex = lastHistory.evaluations.findIndex(
    (entry) => entry.sloBreaches.length > 0,
  );
  if (breachIndex === -1) {
    return undefined;
  }
  const breachTs = new Date(lastHistory.evaluations[breachIndex].collectedAt);
  return now.getTime() - breachTs.getTime();
}
