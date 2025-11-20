export class FeatureTransformer {
  normalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    return values.map(v => range === 0 ? 0 : (v - min) / range);
  }

  standardize(values: number[]): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    return values.map(v => std === 0 ? 0 : (v - mean) / std);
  }

  log(values: number[]): number[] {
    return values.map(v => v > 0 ? Math.log(v) : 0);
  }

  sqrt(values: number[]): number[] {
    return values.map(v => v >= 0 ? Math.sqrt(v) : 0);
  }
}
