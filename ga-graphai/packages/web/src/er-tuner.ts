export interface ThresholdMetrics {
  threshold: number;
  precision: number;
  recall: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface ScoredMatch {
  score: number;
  isMatch: boolean;
}

export function computeThresholdMetrics(
  scores: ScoredMatch[],
  threshold: number
): ThresholdMetrics {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  scores.forEach((record) => {
    if (record.score >= threshold) {
      if (record.isMatch) {
        truePositives += 1;
      } else {
        falsePositives += 1;
      }
    } else if (record.isMatch) {
      falseNegatives += 1;
    }
  });

  const precision =
    truePositives + falsePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
  const recall =
    truePositives + falseNegatives === 0 ? 0 : truePositives / (truePositives + falseNegatives);

  return {
    threshold,
    precision: Number(precision.toFixed(3)),
    recall: Number(recall.toFixed(3)),
    truePositives,
    falsePositives,
    falseNegatives,
  };
}

export function buildThresholdReport(
  scores: ScoredMatch[],
  thresholds: number[]
): ThresholdMetrics[] {
  return thresholds.map((threshold) => computeThresholdMetrics(scores, threshold));
}
