export function holtWinters(series: number[], alpha = 0.3, beta = 0.1) {
  let level = series[0] || 0,
    trend = 0;
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const prevLevel = level;
    level = alpha * series[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    out.push(level + trend);
  }
  return out[out.length - 1];
}
