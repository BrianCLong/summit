/**
 * Test Infrastructure: Metrics Registry Reset
 *
 * Problem: Prometheus metrics registry is a singleton. Tests that register
 * metrics without cleanup cause collisions and test failures.
 *
 * Solution: Reset the global registry before/after each test.
 *
 * Usage:
 *   import { resetMetricRegistry } from '../../test/infra/metrics';
 *
 *   beforeEach(() => {
 *     resetMetricRegistry();
 *   });
 */

import * as promClient from 'prom-client';

/**
 * Reset the Prometheus global metric registry.
 *
 * This clears all registered metrics, preventing collisions between tests.
 * Call this in beforeEach() or afterEach() hooks.
 */
export function resetMetricRegistry(): void {
  promClient.register.clear();
}

/**
 * Get the current metric registry (for assertions).
 */
export function getMetricRegistry(): promClient.Registry {
  return promClient.register;
}

/**
 * Get metrics as a string (Prometheus text format).
 *
 * Useful for assertions:
 *   const metrics = await getMetricsString();
 *   expect(metrics).toContain('my_metric_total 42');
 */
export async function getMetricsString(): Promise<string> {
  return promClient.register.metrics();
}

/**
 * Get a specific metric by name.
 *
 * @param name - Metric name (e.g., 'http_requests_total')
 * @returns Metric instance or undefined if not found
 */
export function getMetric(name: string): promClient.Metric | undefined {
  return promClient.register.getSingleMetric(name);
}

/**
 * Assert that a metric exists.
 *
 * @param name - Metric name
 * @throws Error if metric does not exist
 */
export function assertMetricExists(name: string): void {
  const metric = getMetric(name);
  if (!metric) {
    throw new Error(`Metric '${name}' does not exist in registry`);
  }
}

/**
 * Assert that a metric has a specific value.
 *
 * @param name - Metric name
 * @param expectedValue - Expected value
 * @throws Error if metric value does not match
 */
export async function assertMetricValue(
  name: string,
  expectedValue: number
): Promise<void> {
  const metrics = await getMetricsString();
  const regex = new RegExp(`${name}\\s+(\\d+(?:\\.\\d+)?)`);
  const match = metrics.match(regex);

  if (!match) {
    throw new Error(`Metric '${name}' not found in output:\n${metrics}`);
  }

  const actualValue = parseFloat(match[1]);
  if (actualValue !== expectedValue) {
    throw new Error(
      `Metric '${name}' has value ${actualValue}, expected ${expectedValue}`
    );
  }
}

/**
 * Create a custom registry (for isolated metric tests).
 *
 * Use this when you need a separate registry that doesn't affect the global one.
 *
 * @returns New registry instance
 */
export function createTestRegistry(): promClient.Registry {
  return new promClient.Registry();
}
