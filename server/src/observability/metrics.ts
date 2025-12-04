/**
 * Centralized metrics configuration
 * Re-exports from monitoring/metrics.js to maintain backward compatibility
 * while unifying the registry.
 */

import {
  register as registry,
  intelgraphJobsProcessed as jobsProcessed,
  intelgraphOutboxSyncLatency as outboxSyncLatency,
  intelgraphActiveConnections as activeConnections,
  intelgraphDatabaseQueryDuration as databaseQueryDuration,
  intelgraphHttpRequestDuration as httpRequestDuration,
  intelgraphGraphragQueryTotal as graphragQueryTotal,
  intelgraphGraphragQueryDurationMs as graphragQueryDurationMs,
  intelgraphQueryPreviewsTotal as queryPreviewsTotal,
  intelgraphQueryPreviewLatencyMs as queryPreviewLatencyMs,
  intelgraphQueryPreviewErrorsTotal as queryPreviewErrorsTotal,
  intelgraphQueryPreviewExecutionsTotal as queryPreviewExecutionsTotal,
  intelgraphGlassBoxRunsTotal as glassBoxRunsTotal,
  intelgraphGlassBoxRunDurationMs as glassBoxRunDurationMs,
  intelgraphGlassBoxCacheHits as glassBoxCacheHits,
  intelgraphCacheHits as cacheHits,
  intelgraphCacheMisses as cacheMisses
} from '../monitoring/metrics.js';

export { registry };

export {
  jobsProcessed,
  outboxSyncLatency,
  activeConnections,
  databaseQueryDuration,
  httpRequestDuration,
  graphragQueryTotal,
  graphragQueryDurationMs,
  queryPreviewsTotal,
  queryPreviewLatencyMs,
  queryPreviewErrorsTotal,
  queryPreviewExecutionsTotal,
  glassBoxRunsTotal,
  glassBoxRunDurationMs,
  glassBoxCacheHits,
  cacheHits,
  cacheMisses
};

export const metrics = {
  jobsProcessed,
  outboxSyncLatency,
  activeConnections,
  databaseQueryDuration,
  httpRequestDuration,
  graphragQueryTotal,
  graphragQueryDurationMs,
  queryPreviewsTotal,
  queryPreviewLatencyMs,
  queryPreviewErrorsTotal,
  queryPreviewExecutionsTotal,
  glassBoxRunsTotal,
  glassBoxRunDurationMs,
  glassBoxCacheHits,
  cacheHits,
  cacheMisses,
};
