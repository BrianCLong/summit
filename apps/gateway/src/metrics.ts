/**
 * GraphQL Gateway Metrics
 * Prometheus metrics for Apollo Federation monitoring
 */

import { meter } from './instrumentation';
import type { GraphQLRequestContext } from '@apollo/server';

// Histogram for query duration (milliseconds)
const queryDurationHistogram = meter.createHistogram(
  'graphql_query_duration_ms',
  {
    description: 'GraphQL query execution duration in milliseconds',
    unit: 'ms',
    advice: {
      explicitBucketBoundaries: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    },
  }
);

// Counter for total requests
const requestsCounter = meter.createCounter('graphql_requests_total', {
  description: 'Total GraphQL requests',
});

// Counter for errors
const errorsCounter = meter.createCounter('graphql_errors_total', {
  description: 'Total GraphQL errors',
});

// Histogram for resolver duration
const resolverDurationHistogram = meter.createHistogram(
  'graphql_resolver_duration_ms',
  {
    description: 'GraphQL resolver execution duration in milliseconds',
    unit: 'ms',
    advice: {
      explicitBucketBoundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    },
  }
);

// Gauge for query complexity
const queryComplexityGauge = meter.createUpDownCounter(
  'graphql_query_complexity',
  {
    description: 'GraphQL query complexity score',
  }
);

// Cache metrics
const cacheHitsCounter = meter.createCounter('graphql_cache_hits_total', {
  description: 'GraphQL cache hits',
});

const cacheMissesCounter = meter.createCounter('graphql_cache_misses_total', {
  description: 'GraphQL cache misses',
});

// Golden path metrics
const goldenPathSuccessCounter = meter.createCounter(
  'golden_path_success_total',
  {
    description: 'Golden path step successes',
  }
);

const goldenPathDurationHistogram = meter.createHistogram(
  'golden_path_duration_ms',
  {
    description: 'Golden path step duration in milliseconds',
    unit: 'ms',
  }
);

const goldenPathErrorsCounter = meter.createCounter(
  'golden_path_errors_total',
  {
    description: 'Golden path step errors',
  }
);

// Metric recording functions

export function recordQueryDuration(
  operationName: string | null,
  operationType: string,
  durationMs: number,
  status: 'success' | 'error'
): void {
  queryDurationHistogram.record(durationMs, {
    operation: operationName || 'anonymous',
    operationType,
    status,
  });

  requestsCounter.add(1, {
    operation: operationName || 'anonymous',
    operationType,
    status,
  });
}

export function recordError(
  operationName: string | null,
  errorType: string,
  errorCode?: string
): void {
  errorsCounter.add(1, {
    operation: operationName || 'anonymous',
    errorType,
    errorCode: errorCode || 'unknown',
  });
}

export function recordResolverDuration(
  typeName: string,
  fieldName: string,
  durationMs: number,
  status: 'success' | 'error'
): void {
  resolverDurationHistogram.record(durationMs, {
    typeName,
    fieldName,
    status,
  });
}

export function recordQueryComplexity(
  operationName: string | null,
  complexity: number
): void {
  queryComplexityGauge.add(complexity, {
    operation: operationName || 'anonymous',
  });
}

export function recordCacheHit(operationName: string | null): void {
  cacheHitsCounter.add(1, {
    operation: operationName || 'anonymous',
  });
}

export function recordCacheMiss(operationName: string | null): void {
  cacheMissesCounter.add(1, {
    operation: operationName || 'anonymous',
  });
}

// Golden path metrics

export function recordGoldenPathSuccess(
  step: string,
  durationMs: number
): void {
  goldenPathSuccessCounter.add(1, { step });
  goldenPathDurationHistogram.record(durationMs, { step });
}

export function recordGoldenPathError(step: string, errorType: string): void {
  goldenPathErrorsCounter.add(1, { step, errorType });
}

// Helper to extract operation info from request context
export function getOperationInfo(
  requestContext: GraphQLRequestContext<any>
): {
  operationName: string | null;
  operationType: string;
} {
  const operationName = requestContext.request.operationName || null;
  const operation = requestContext.operation;

  let operationType = 'unknown';
  if (operation) {
    operationType = operation.operation; // 'query', 'mutation', 'subscription'
  }

  return { operationName, operationType };
}
