/**
 * Calculate the moving average for a numeric series.
 *
 * @param {number[]} data - Input samples in chronological order.
 * @param {number} windowSize - Number of points to include per window.
 * @returns {number[]} A smoothed series of moving averages.
 */
export function movingAverage(data, windowSize) {
  const result = [];
  for (let i = 0; i < data.length; i += 1) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = data.slice(start, i + 1);
    const sum = slice.reduce((acc, value) => acc + value, 0);
    result.push(Number((sum / slice.length).toFixed(2)));
  }
  return result;
}

/**
 * Build a histogram for discrete buckets using an arrow function.
 *
 * Buckets are pre-defined ranges that capture the number of values
 * falling into each group.
 */
export const buildHistogram = (values, buckets) => {
  return buckets.map((bucket) => {
    const count = values.filter((value) => value >= bucket.min && value <= bucket.max).length;
    return { ...bucket, count };
  });
};
