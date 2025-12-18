/**
 * Metrics calculation utilities
 */

export interface ConfusionMatrix {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  specificity: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  mcc: number; // Matthews Correlation Coefficient
}

/**
 * Calculate classification metrics from confusion matrix
 */
export function calculateMetrics(cm: ConfusionMatrix): ClassificationMetrics {
  const { truePositives: tp, trueNegatives: tn, falsePositives: fp, falseNegatives: fn } = cm;

  const total = tp + tn + fp + fn;

  if (total === 0) {
    throw new Error('Confusion matrix is empty');
  }

  const accuracy = (tp + tn) / total;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const specificity = tn + fp === 0 ? 0 : tn / (tn + fp);

  const f1Score = precision + recall === 0
    ? 0
    : 2 * (precision * recall) / (precision + recall);

  const falsePositiveRate = 1 - specificity;
  const falseNegativeRate = 1 - recall;

  // Matthews Correlation Coefficient
  const numerator = tp * tn - fp * fn;
  const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const mcc = denominator === 0 ? 0 : numerator / denominator;

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    specificity,
    falsePositiveRate,
    falseNegativeRate,
    mcc,
  };
}

/**
 * Calculate Equal Error Rate (EER) from scores and labels
 */
export function calculateEER(
  scores: number[],
  labels: boolean[],
): { eer: number; threshold: number } {
  if (scores.length !== labels.length) {
    throw new Error('Scores and labels must have same length');
  }

  // Sort by score
  const sorted = scores
    .map((score, i) => ({ score, label: labels[i] }))
    .sort((a, b) => b.score - a.score);

  let minDiff = Infinity;
  let eerThreshold = 0;
  let eer = 0;

  const positiveCount = labels.filter((l) => l).length;
  const negativeCount = labels.length - positiveCount;

  let truePositives = 0;
  let falsePositives = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].label) {
      truePositives++;
    } else {
      falsePositives++;
    }

    const falseNegatives = positiveCount - truePositives;
    const trueNegatives = negativeCount - falsePositives;

    const far = falsePositives / negativeCount; // False Accept Rate
    const frr = falseNegatives / positiveCount; // False Reject Rate

    const diff = Math.abs(far - frr);
    if (diff < minDiff) {
      minDiff = diff;
      eerThreshold = sorted[i].score;
      eer = (far + frr) / 2;
    }
  }

  return { eer, threshold: eerThreshold };
}

/**
 * Calculate AUC-ROC (Area Under Receiver Operating Characteristic curve)
 */
export function calculateAUC(scores: number[], labels: boolean[]): number {
  if (scores.length !== labels.length) {
    throw new Error('Scores and labels must have same length');
  }

  // Sort by score
  const sorted = scores
    .map((score, i) => ({ score, label: labels[i] }))
    .sort((a, b) => b.score - a.score);

  const positiveCount = labels.filter((l) => l).length;
  const negativeCount = labels.length - positiveCount;

  if (positiveCount === 0 || negativeCount === 0) {
    throw new Error('Need both positive and negative samples');
  }

  let tpr = 0;
  let fpr = 0;
  let auc = 0;

  let prevTPR = 0;
  let prevFPR = 0;

  let truePositives = 0;
  let falsePositives = 0;

  for (const item of sorted) {
    if (item.label) {
      truePositives++;
    } else {
      falsePositives++;
    }

    tpr = truePositives / positiveCount;
    fpr = falsePositives / negativeCount;

    // Trapezoidal integration
    auc += (fpr - prevFPR) * (tpr + prevTPR) / 2;

    prevTPR = tpr;
    prevFPR = fpr;
  }

  return auc;
}

/**
 * Calculate Population Stability Index (PSI) for drift detection
 */
export function calculatePSI(
  baseline: number[],
  current: number[],
  numBins: number = 10,
): number {
  if (baseline.length === 0 || current.length === 0) {
    throw new Error('Baseline and current distributions cannot be empty');
  }

  // Determine bin edges from baseline distribution
  const sortedBaseline = [...baseline].sort((a, b) => a - b);
  const binEdges: number[] = [];

  for (let i = 0; i <= numBins; i++) {
    const index = Math.floor((i / numBins) * sortedBaseline.length);
    binEdges.push(sortedBaseline[Math.min(index, sortedBaseline.length - 1)]);
  }

  // Count samples in each bin for both distributions
  const baselineCounts = countInBins(baseline, binEdges);
  const currentCounts = countInBins(current, binEdges);

  // Calculate PSI
  let psi = 0;

  for (let i = 0; i < numBins; i++) {
    const baselinePercent = baselineCounts[i] / baseline.length;
    const currentPercent = currentCounts[i] / current.length;

    // Avoid log(0) by adding small epsilon
    const epsilon = 1e-10;
    const psiTerm =
      (currentPercent - baselinePercent) *
      Math.log((currentPercent + epsilon) / (baselinePercent + epsilon));

    psi += psiTerm;
  }

  return psi;
}

/**
 * Count samples in bins
 */
function countInBins(data: number[], binEdges: number[]): number[] {
  const counts = new Array(binEdges.length - 1).fill(0);

  for (const value of data) {
    for (let i = 0; i < binEdges.length - 1; i++) {
      if (value >= binEdges[i] && value < binEdges[i + 1]) {
        counts[i]++;
        break;
      } else if (i === binEdges.length - 2 && value >= binEdges[i + 1]) {
        // Last bin includes right edge
        counts[i]++;
        break;
      }
    }
  }

  return counts;
}

/**
 * Calculate KL divergence for drift detection
 */
export function calculateKLDivergence(
  p: number[],
  q: number[],
): number {
  if (p.length !== q.length) {
    throw new Error('Distributions must have same length');
  }

  let kl = 0;
  const epsilon = 1e-10;

  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) {
      kl += p[i] * Math.log((p[i] + epsilon) / (q[i] + epsilon));
    }
  }

  return kl;
}

/**
 * Calculate calibration error (Expected Calibration Error)
 */
export function calculateCalibrationError(
  scores: number[],
  labels: boolean[],
  numBins: number = 10,
): number {
  if (scores.length !== labels.length) {
    throw new Error('Scores and labels must have same length');
  }

  const binEdges = Array.from({ length: numBins + 1 }, (_, i) => i / numBins);

  let ece = 0;

  for (let i = 0; i < numBins; i++) {
    const inBin = scores
      .map((score, idx) => ({ score, label: labels[idx] }))
      .filter((item) => item.score >= binEdges[i] && item.score < binEdges[i + 1]);

    if (inBin.length === 0) continue;

    const avgConfidence = inBin.reduce((sum, item) => sum + item.score, 0) / inBin.length;
    const accuracy = inBin.filter((item) => item.label).length / inBin.length;

    ece += (inBin.length / scores.length) * Math.abs(avgConfidence - accuracy);
  }

  return ece;
}

/**
 * Calculate percentiles
 */
export function calculatePercentiles(
  values: number[],
  percentiles: number[] = [50, 95, 99],
): Record<string, number> {
  if (values.length === 0) {
    throw new Error('Cannot calculate percentiles of empty array');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<string, number> = {};

  for (const p of percentiles) {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    result[`p${p}`] = sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  return result;
}

/**
 * Calculate summary statistics
 */
export function calculateSummaryStats(values: number[]): {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  count: number;
} {
  if (values.length === 0) {
    throw new Error('Cannot calculate statistics of empty array');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;

  const mean = values.reduce((sum, val) => sum + val, 0) / count;
  const median = sorted[Math.floor(count / 2)];
  const min = sorted[0];
  const max = sorted[count - 1];

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
  const std = Math.sqrt(variance);

  return { mean, median, std, min, max, count };
}
