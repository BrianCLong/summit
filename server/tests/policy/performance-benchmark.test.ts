describe('performance benchmark', () => {
  test('all operations complete within the configured budgets', () => {
    const {
      runPerformanceBenchmark,
      measureOperation,
    } = require('../../../scripts/ci/performance-benchmark.cjs');
    const result = runPerformanceBenchmark();
    expect(result.passed).toBe(true);
    expect(result.details.every((detail) => detail.includes('limit'))).toBe(
      true,
    );

    const quickDuration = measureOperation(() => {
      const values = Array.from({ length: 1000 }, (_, index) => index * 2);
      values.reverse();
    });
    expect(quickDuration).toBeGreaterThanOrEqual(0);
  });
});
