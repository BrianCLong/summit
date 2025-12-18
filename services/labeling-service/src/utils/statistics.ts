/**
 * Statistical utilities for inter-rater agreement
 */

// ============================================================================
// Inter-Rater Agreement Calculations
// ============================================================================

/**
 * Calculate Cohen's Kappa for two raters
 * Measures agreement between two raters, accounting for chance
 */
export function calculateCohensKappa(
  rater1: any[],
  rater2: any[],
): number | null {
  if (rater1.length !== rater2.length || rater1.length === 0) {
    return null;
  }

  const n = rater1.length;

  // Get all unique categories
  const categories = new Set([...rater1, ...rater2]);
  const categoryList = Array.from(categories);

  // Build confusion matrix
  const matrix: Record<string, Record<string, number>> = {};
  for (const cat of categoryList) {
    matrix[cat] = {};
    for (const cat2 of categoryList) {
      matrix[cat][cat2] = 0;
    }
  }

  for (let i = 0; i < n; i++) {
    const r1 = String(rater1[i]);
    const r2 = String(rater2[i]);
    matrix[r1][r2]++;
  }

  // Calculate observed agreement
  let observedAgreement = 0;
  for (const cat of categoryList) {
    observedAgreement += matrix[cat][cat];
  }
  const po = observedAgreement / n;

  // Calculate expected agreement by chance
  let expectedAgreement = 0;
  for (const cat of categoryList) {
    let rater1Count = 0;
    let rater2Count = 0;

    for (const cat2 of categoryList) {
      rater1Count += matrix[cat][cat2];
      rater2Count += matrix[cat2][cat];
    }

    expectedAgreement += (rater1Count / n) * (rater2Count / n);
  }
  const pe = expectedAgreement;

  // Cohen's Kappa
  if (pe === 1) {
    return 1; // Perfect agreement
  }

  const kappa = (po - pe) / (1 - pe);
  return kappa;
}

/**
 * Calculate Fleiss' Kappa for multiple raters
 * Measures agreement among multiple raters on categorical data
 */
export function calculateFleissKappa(
  ratings: any[][], // Each row is a subject, each column is a rater
): number | null {
  if (ratings.length === 0 || ratings[0].length < 2) {
    return null;
  }

  const n = ratings.length; // Number of subjects
  const N = ratings[0].length; // Number of raters

  // Get all unique categories
  const allCategories = new Set<any>();
  for (const subject of ratings) {
    for (const rating of subject) {
      allCategories.add(rating);
    }
  }
  const categories = Array.from(allCategories);
  const k = categories.length; // Number of categories

  // Build frequency matrix: n_ij = count of category j for subject i
  const freqMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    const freq: number[] = new Array(k).fill(0);
    for (const rating of ratings[i]) {
      const catIndex = categories.indexOf(rating);
      if (catIndex !== -1) {
        freq[catIndex]++;
      }
    }
    freqMatrix.push(freq);
  }

  // Calculate P_i (extent of agreement for subject i)
  const P: number[] = [];
  for (let i = 0; i < n; i++) {
    let sumSquares = 0;
    for (let j = 0; j < k; j++) {
      sumSquares += freqMatrix[i][j] * freqMatrix[i][j];
    }
    P[i] = (sumSquares - N) / (N * (N - 1));
  }

  // Calculate P̄ (mean of P_i)
  const Pbar = P.reduce((sum, p) => sum + p, 0) / n;

  // Calculate p_j (proportion of all assignments to category j)
  const p: number[] = new Array(k).fill(0);
  for (let j = 0; j < k; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += freqMatrix[i][j];
    }
    p[j] = sum / (n * N);
  }

  // Calculate P̄_e (expected agreement by chance)
  let Pbar_e = 0;
  for (let j = 0; j < k; j++) {
    Pbar_e += p[j] * p[j];
  }

  // Fleiss' Kappa
  if (Pbar_e === 1) {
    return 1; // Perfect agreement
  }

  const kappa = (Pbar - Pbar_e) / (1 - Pbar_e);
  return kappa;
}

/**
 * Calculate percentage agreement (simple agreement rate)
 */
export function calculatePercentAgreement(
  rater1: any[],
  rater2: any[],
): number {
  if (rater1.length !== rater2.length || rater1.length === 0) {
    return 0;
  }

  let agreements = 0;
  for (let i = 0; i < rater1.length; i++) {
    if (rater1[i] === rater2[i]) {
      agreements++;
    }
  }

  return agreements / rater1.length;
}

/**
 * Build confusion matrix for two raters
 */
export function buildConfusionMatrix(
  rater1: any[],
  rater2: any[],
): Record<string, Record<string, number>> {
  const categories = new Set([...rater1, ...rater2]);
  const categoryList = Array.from(categories);

  const matrix: Record<string, Record<string, number>> = {};
  for (const cat of categoryList) {
    matrix[cat] = {};
    for (const cat2 of categoryList) {
      matrix[cat][cat2] = 0;
    }
  }

  for (let i = 0; i < rater1.length; i++) {
    const r1 = String(rater1[i]);
    const r2 = String(rater2[i]);
    matrix[r1][r2]++;
  }

  return matrix;
}

/**
 * Interpret Kappa score
 */
export function interpretKappa(kappa: number): string {
  if (kappa < 0) return 'Poor (less than chance)';
  if (kappa < 0.2) return 'Slight';
  if (kappa < 0.4) return 'Fair';
  if (kappa < 0.6) return 'Moderate';
  if (kappa < 0.8) return 'Substantial';
  return 'Almost Perfect';
}

/**
 * Calculate average (mean)
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate median
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = calculateMean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = calculateMean(squaredDiffs);

  return Math.sqrt(variance);
}
