/**
 * Calculates the Exponentially Weighted Moving Average (EWMA).
 *
 * @param prev - The previous EWMA value.
 * @param x - The current value.
 * @param alpha - The smoothing factor (0 < alpha <= 1). Defaults to 0.2.
 * @returns The new EWMA value.
 */
export function ewma(prev: number, x: number, alpha = 0.2) {
  return alpha * x + (1 - alpha) * prev;
}

/**
 * Calculates the robust Z-score (modified Z-score).
 * Uses Median Absolute Deviation (MAD) instead of standard deviation for robustness against outliers.
 *
 * @param x - The value to score.
 * @param mu - The median (or mean) of the series.
 * @param mad - The Median Absolute Deviation of the series.
 * @returns The robust Z-score.
 */
export function robustZ(x: number, mu: number, mad: number) {
  return mad ? Math.abs(x - mu) / (1.4826 * mad) : 0;
}

function median(a: number[]) {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}

/**
 * Detects if the latest value in a series is an anomaly.
 * Uses robust Z-score with a threshold of 4.
 *
 * @param series - The historical data series.
 * @param latest - The latest value to check.
 * @returns An object indicating if it's an anomaly and the Z-score.
 */
export function detectAnomalySeries(series: number[], latest: number) {
  const mu = series.reduce((a, b) => a + b, 0) / Math.max(1, series.length);
  const mad = median(series.map((v) => Math.abs(v - mu)));
  const z = robustZ(latest, mu, mad);
  return { anomaly: z >= 4, z };
}
