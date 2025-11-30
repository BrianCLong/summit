export function ewma(prev: number, x: number, alpha = 0.2) {
  return alpha * x + (1 - alpha) * prev;
}
export function robustZ(x: number, mu: number, mad: number) {
  return mad ? Math.abs(x - mu) / (1.4826 * mad) : 0;
}

export function median(a: number[]) {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}

export function detectAnomalySeries(series: number[], latest: number) {
  const mu = series.reduce((a, b) => a + b, 0) / Math.max(1, series.length);
  const mad = median(series.map((v) => Math.abs(v - mu)));
  const z = robustZ(latest, mu, mad);
  return { anomaly: z >= 4, z };
}
