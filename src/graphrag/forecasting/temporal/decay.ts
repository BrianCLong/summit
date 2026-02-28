export function temporalDecay(weight: number, deltaDays: number): number {
  if (!process.env.FEATURE_EMBEDDED_FORECASTING || process.env.FEATURE_EMBEDDED_FORECASTING === 'false') {
    return weight;
  }
  return weight * Math.exp(-0.05 * deltaDays);
}
