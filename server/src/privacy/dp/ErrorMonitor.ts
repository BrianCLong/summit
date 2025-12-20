/**
 * Checks if an observed value is within the expected error bound based on variance.
 * Useful for verifying differential privacy noise or statistical error ranges.
 *
 * @param observed - The observed deviation or error value.
 * @param expectedVar - The expected variance of the noise or error.
 * @param z - The Z-score for the confidence interval (default: 1.96 for 95% confidence).
 * @returns An object indicating if the value is within bounds and the calculated bound.
 */
export function withinErrorBound(
  observed: number,
  expectedVar: number,
  z = 1.96,
) {
  const bound = Math.sqrt(expectedVar) * z;
  return { ok: Math.abs(observed) <= bound, bound };
}
