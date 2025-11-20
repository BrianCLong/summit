import { OptimizationStudy, TrialResult } from '../types';

/**
 * Early stopping strategies for hyperparameter optimization
 */
export class EarlyStoppingStrategy {
  /**
   * Median pruning: Stop trial if performance is below median of completed trials at same step
   */
  static medianPruning(
    study: OptimizationStudy,
    currentTrial: Partial<TrialResult>,
    step: number
  ): boolean {
    const completedAtStep = study.trials.filter(
      t => t.status === 'completed' && t.metadata?.step === step
    );

    if (completedAtStep.length < 3) {
      return false; // Not enough data
    }

    const scores = completedAtStep.map(t => t.score);
    const median = this.calculateMedian(scores);

    const currentScore = currentTrial.score || 0;
    const shouldStop = study.config.objective === 'maximize'
      ? currentScore < median
      : currentScore > median;

    return shouldStop;
  }

  /**
   * Hyperband early stopping
   */
  static hyperband(
    study: OptimizationStudy,
    currentTrial: Partial<TrialResult>,
    bracket: number,
    iteration: number
  ): boolean {
    // Hyperband algorithm implementation
    const _maxIter = Math.pow(3, bracket);
    const eta = 3;

    const trialsInBracket = study.trials.filter(
      t => t.metadata?.bracket === bracket && t.metadata?.iteration === iteration
    );

    if (trialsInBracket.length === 0) return false;

    // Keep top 1/eta of trials
    const keepCount = Math.ceil(trialsInBracket.length / eta);
    const sorted = trialsInBracket
      .sort((a, b) => {
        const objective = study.config.objective;
        return objective === 'maximize' ? b.score - a.score : a.score - b.score;
      });

    const currentScore = currentTrial.score || 0;
    const threshold = sorted[keepCount - 1]?.score || 0;

    return study.config.objective === 'maximize'
      ? currentScore < threshold
      : currentScore > threshold;
  }

  /**
   * Successive halving
   */
  static successiveHalving(
    study: OptimizationStudy,
    currentTrial: Partial<TrialResult>,
    round: number,
    _totalRounds: number
  ): boolean {
    const trialsInRound = study.trials.filter(
      t => t.metadata?.round === round
    );

    if (trialsInRound.length === 0) return false;

    // Keep top 50% each round
    const keepRatio = Math.pow(0.5, round);
    const keepCount = Math.max(1, Math.ceil(trialsInRound.length * keepRatio));

    const sorted = trialsInRound
      .sort((a, b) => {
        const objective = study.config.objective;
        return objective === 'maximize' ? b.score - a.score : a.score - b.score;
      });

    const currentScore = currentTrial.score || 0;
    const threshold = sorted[keepCount - 1]?.score || 0;

    return study.config.objective === 'maximize'
      ? currentScore < threshold
      : currentScore > threshold;
  }

  /**
   * Performance-based early stopping
   */
  static performanceThreshold(
    currentTrial: Partial<TrialResult>,
    threshold: number,
    objective: 'maximize' | 'minimize'
  ): boolean {
    const currentScore = currentTrial.score || 0;

    return objective === 'maximize'
      ? currentScore < threshold
      : currentScore > threshold;
  }

  private static calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}
