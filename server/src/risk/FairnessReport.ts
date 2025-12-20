export type CohortScores = Record<string, number[]>;

/**
 * Calculates the Kolmogorov-Smirnov (KS) distance between two empirical distributions.
 * This metric quantifies the difference between the cumulative distribution functions of two samples.
 * Useful for assessing model fairness or distribution drift.
 *
 * @param a - The first sample of scores.
 * @param b - The second sample of scores.
 * @returns The KS distance (max difference between CDFs).
 */
export function ksDistance(a: number[], b: number[]): number {
  const sortedA = a.slice().sort((x, y) => x - y);
  const sortedB = b.slice().sort((x, y) => x - y);
  let i = 0;
  let j = 0;
  let d = 0;
  while (i < sortedA.length && j < sortedB.length) {
    const va = sortedA[i];
    const vb = sortedB[j];
    if (va <= vb) i++;
    else j++;
    const cdfA = i / sortedA.length;
    const cdfB = j / sortedB.length;
    d = Math.max(d, Math.abs(cdfA - cdfB));
  }
  return d;
}

/**
 * Generates a fairness report comparing score distributions between cohorts.
 * Uses KS distance to measure disparity.
 *
 * @param data - A map of cohort names to their score arrays.
 * @returns A string summary of the fairness analysis.
 */
export function generateReport(data: CohortScores): string {
  const keys = Object.keys(data);
  if (keys.length < 2) return 'insufficient cohorts';
  const d = ksDistance(data[keys[0]], data[keys[1]]);
  return `KS distance between ${keys[0]} and ${keys[1]}: ${d.toFixed(3)}`;
}
