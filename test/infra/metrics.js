"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMetricRegistry = resetMetricRegistry;
exports.getMetricRegistry = getMetricRegistry;
exports.getMetricsString = getMetricsString;
exports.getMetric = getMetric;
exports.assertMetricExists = assertMetricExists;
exports.assertMetricValue = assertMetricValue;
exports.createTestRegistry = createTestRegistry;
const promClient = __importStar(require("prom-client"));
/**
 * Reset the Prometheus global metric registry.
 *
 * This clears all registered metrics, preventing collisions between tests.
 * Call this in beforeEach() or afterEach() hooks.
 */
function resetMetricRegistry() {
    promClient.register.clear();
}
/**
 * Get the current metric registry (for assertions).
 */
function getMetricRegistry() {
    return promClient.register;
}
/**
 * Get metrics as a string (Prometheus text format).
 *
 * Useful for assertions:
 *   const metrics = await getMetricsString();
 *   expect(metrics).toContain('my_metric_total 42');
 */
async function getMetricsString() {
    return promClient.register.metrics();
}
/**
 * Get a specific metric by name.
 *
 * @param name - Metric name (e.g., 'http_requests_total')
 * @returns Metric instance or undefined if not found
 */
function getMetric(name) {
    return promClient.register.getSingleMetric(name);
}
/**
 * Assert that a metric exists.
 *
 * @param name - Metric name
 * @throws Error if metric does not exist
 */
function assertMetricExists(name) {
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
async function assertMetricValue(name, expectedValue) {
    const metrics = await getMetricsString();
    const regex = new RegExp(`${name}\\s+(\\d+(?:\\.\\d+)?)`);
    const match = metrics.match(regex);
    if (!match) {
        throw new Error(`Metric '${name}' not found in output:\n${metrics}`);
    }
    const actualValue = parseFloat(match[1]);
    if (actualValue !== expectedValue) {
        throw new Error(`Metric '${name}' has value ${actualValue}, expected ${expectedValue}`);
    }
}
/**
 * Create a custom registry (for isolated metric tests).
 *
 * Use this when you need a separate registry that doesn't affect the global one.
 *
 * @returns New registry instance
 */
function createTestRegistry() {
    return new promClient.Registry();
}
