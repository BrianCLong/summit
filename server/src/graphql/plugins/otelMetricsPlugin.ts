import type { ApolloServerPlugin } from '@apollo/server';
import { metrics, trace, diag } from '@opentelemetry/api';
import { getOperationAST } from 'graphql';
import { getComplexity, simpleEstimator, fieldConfigEstimator } from 'graphql-query-complexity';

interface OperationStats {
  operationName: string;
  operationType: string;
  requests: number;
  errors: number;
}

const meter = metrics.getMeter('intelgraph-api-gateway');

const complexityHistogram = meter.createHistogram('graphql_query_complexity', {
  description: 'GraphQL request complexity score estimated via graphql-query-complexity',
  unit: 'cost',
});

const requestCounter = meter.createCounter('graphql_requests_total', {
  description: 'Total GraphQL requests observed by the IntelGraph API gateway',
});

const errorCounter = meter.createCounter('graphql_request_errors_total', {
  description: 'Total GraphQL request errors observed by the IntelGraph API gateway',
});

const errorRateGauge = meter.createObservableGauge('graphql_error_rate', {
  description: 'Ratio of GraphQL requests that resulted in one or more errors',
});

const operationStats = new Map<string, OperationStats>();
let totalRequests = 0;
let totalErrors = 0;

type OperationType = 'query' | 'mutation' | 'subscription' | 'unknown';

function normalizeOperationName(name?: string | null): string {
  return name && name.trim().length > 0 ? name.trim() : 'anonymous';
}

function normalizeOperationType(type?: string | null): OperationType {
  if (!type) {
    return 'unknown';
  }
  if (type === 'query' || type === 'mutation' || type === 'subscription') {
    return type;
  }
  return 'unknown';
}

function statsKey(operationName: string, operationType: OperationType): string {
  return `${operationType}:${operationName}`;
}

function getOrCreateStats(operationName: string, operationType: OperationType): OperationStats {
  const key = statsKey(operationName, operationType);
  let stats = operationStats.get(key);
  if (!stats) {
    stats = {
      operationName,
      operationType,
      requests: 0,
      errors: 0,
    };
    operationStats.set(key, stats);
  }
  return stats;
}

function recordRequest(operationName: string, operationType: OperationType): void {
  const name = normalizeOperationName(operationName);
  const type = normalizeOperationType(operationType);
  totalRequests += 1;
  requestCounter.add(1, { operation: name, operation_type: type });
  const stats = getOrCreateStats(name, type);
  stats.requests += 1;
}

function recordError(operationName: string, operationType: OperationType, errorCode: string): void {
  const name = normalizeOperationName(operationName);
  const type = normalizeOperationType(operationType);
  totalErrors += 1;
  errorCounter.add(1, { operation: name, operation_type: type, error_code: errorCode });
  const stats = getOrCreateStats(name, type);
  stats.errors += 1;
}

errorRateGauge.addCallback((observableResult) => {
  if (totalRequests === 0) {
    observableResult.observe(0, { operation: 'all', operation_type: 'aggregate' });
    return;
  }

  observableResult.observe(totalErrors / totalRequests, {
    operation: 'all',
    operation_type: 'aggregate',
  });

  for (const stats of operationStats.values()) {
    const ratio = stats.requests === 0 ? 0 : stats.errors / stats.requests;
    observableResult.observe(ratio, {
      operation: stats.operationName,
      operation_type: stats.operationType,
    });
  }
});

export function graphqlOtelMetricsPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart(requestContext) {
      let recorded = false;
      let operationName = normalizeOperationName(requestContext.request.operationName);
      let operationType: OperationType = 'unknown';
      let spanErrorCount = 0;
      let lastComplexity: number | undefined;

      return {
        didResolveOperation(ctx) {
          operationName = normalizeOperationName(ctx.operationName ?? operationName);
          const operationAst =
            ctx.operation ??
            (ctx.document ? getOperationAST(ctx.document, ctx.operationName ?? undefined) ?? undefined : undefined);
          operationType = normalizeOperationType(operationAst?.operation ?? ctx.operation?.operation ?? operationType);

          if (!recorded) {
            recordRequest(operationName, operationType);
            recorded = true;
          }

          if (ctx.document) {
            try {
              const complexity = getComplexity({
                schema: ctx.schema,
                query: ctx.document,
                variables: ctx.request.variables ?? {},
                estimators: [fieldConfigEstimator(), simpleEstimator({ defaultComplexity: 1 })],
              });
              lastComplexity = complexity;
              complexityHistogram.record(complexity, {
                operation: operationName,
                operation_type: operationType,
              });
              const activeSpan = trace.getActiveSpan();
              if (activeSpan) {
                activeSpan.setAttribute('graphql.operation.name', operationName);
                activeSpan.setAttribute('graphql.operation.type', operationType);
                activeSpan.setAttribute('graphql.request.complexity', complexity);
              }
            } catch (error) {
              diag.debug('Failed to calculate GraphQL query complexity', error as Error);
            }
          }
        },

        didEncounterErrors(ctx) {
          operationName = normalizeOperationName(ctx.operationName ?? operationName);
          if (ctx.operation) {
            operationType = normalizeOperationType(ctx.operation.operation ?? operationType);
          }

          if (!recorded) {
            recordRequest(operationName, operationType);
            recorded = true;
          }

          for (const error of ctx.errors) {
            const errorCode = typeof error?.extensions?.code === 'string' ? error.extensions.code : 'UNKNOWN';
            recordError(operationName, operationType, errorCode);
            spanErrorCount += 1;
            const activeSpan = trace.getActiveSpan();
            if (activeSpan) {
              activeSpan.recordException(error);
            }
          }
        },

        willSendResponse() {
          const activeSpan = trace.getActiveSpan();
          if (activeSpan) {
            activeSpan.setAttribute('graphql.request.error_count', spanErrorCount);
            if (lastComplexity !== undefined) {
              activeSpan.setAttribute('graphql.request.complexity', lastComplexity);
            }
          }

          if (!recorded) {
            recordRequest(operationName, operationType);
            recorded = true;
          }
        },
      };
    },
  };
}

export default graphqlOtelMetricsPlugin;
