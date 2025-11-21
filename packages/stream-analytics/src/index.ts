/**
 * Stream Analytics Package
 *
 * Real-time analytics capabilities:
 * - Real-time metrics (count, sum, avg, min, max, percentiles)
 * - Moving averages and rolling statistics
 * - Top-K and heavy hitters
 * - Distinct count estimation (HyperLogLog)
 * - Session and funnel analytics
 * - Time-series aggregations
 * - Multi-dimensional analytics
 */

export * from './metrics';
export * from './analytics';
export * from './ml-inference';
export * from './enrichment';
export * from './session-analytics';
export * from './funnel';
