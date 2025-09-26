import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import type { GraphQLFormattedError, OperationDefinitionNode } from 'graphql';
import fetch from 'node-fetch';
import { trace, SpanKind, SpanStatusCode, context as otelContext } from '@opentelemetry/api';
import logger from '../../config/logger.js';

interface GraphQLQueryLogEntry {
  '@timestamp': string;
  traceId: string;
  spanId: string;
  durationMs: number;
  status: 'ok' | 'error';
  requestId?: string;
  http?: {
    method?: string;
    path?: string;
    userAgent?: string;
    ip?: string;
  };
  operation: {
    name: string | null;
    type: string | null;
    rootFields: string[];
    document: string | null;
  };
  variables: Record<string, string>;
  user: {
    id?: string;
    email?: string;
    tenant?: string;
    role?: string;
  };
  errors?: Array<Pick<GraphQLFormattedError, 'message' | 'path' | 'extensions'>>;
}

const tracer = trace.getTracer('intelgraph-graphql');
const FALLBACK_ELASTIC_INDEX = 'graphql-query-logs-v1';
const MAX_QUERY_LENGTH = Number(process.env.GRAPHQL_LOG_MAX_QUERY_LENGTH ?? '2000');
const MAX_VARIABLE_VALUE_LENGTH = Number(process.env.GRAPHQL_LOG_MAX_VARIABLE_VALUE_LENGTH ?? '256');
const LOG_TIMEOUT_MS = Number(process.env.GRAPHQL_LOG_ELASTIC_TIMEOUT_MS ?? '2000');
let missingElasticWarningLogged = false;

function sanitizeQuery(query?: string | null): string | null {
  if (!query) return null;
  if (query.length <= MAX_QUERY_LENGTH) return query;
  return `${query.slice(0, MAX_QUERY_LENGTH)}…`;
}

function summarizeVariables(variables: Record<string, unknown> | undefined | null): Record<string, string> {
  if (!variables) return {};

  return Object.entries(variables).reduce<Record<string, string>>((acc, [key, value]) => {
    let summary: string;
    if (value === null || value === undefined) {
      summary = String(value);
    } else if (Array.isArray(value)) {
      summary = `[array:${value.length}]`;
    } else if (typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      summary = `[object keys=${keys.slice(0, 5).join(',')}${keys.length > 5 ? ',…' : ''}]`;
    } else {
      const raw = String(value);
      summary = raw.length > MAX_VARIABLE_VALUE_LENGTH ? `${raw.slice(0, MAX_VARIABLE_VALUE_LENGTH)}…` : raw;
    }
    acc[key] = summary;
    return acc;
  }, {});
}

function rootFieldsFromOperation(operation: OperationDefinitionNode | null | undefined): string[] {
  if (!operation) return [];
  return operation.selectionSet.selections
    .map((selection) => (selection.kind === 'Field' ? selection.name.value : undefined))
    .filter((value): value is string => Boolean(value));
}

async function sendToElasticsearch(entry: GraphQLQueryLogEntry, elasticUrl?: string, index?: string): Promise<void> {
  if (!elasticUrl) {
    if (!missingElasticWarningLogged) {
      logger.warn('GraphQL query logging skipped: ELASTICSEARCH_URL not configured');
      missingElasticWarningLogged = true;
    }
    return;
  }

  const targetIndex = index || FALLBACK_ELASTIC_INDEX;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOG_TIMEOUT_MS);

  try {
    const response = await fetch(`${elasticUrl.replace(/\/$/, '')}/${targetIndex}/_doc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entry),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Failed to index GraphQL query log in Elasticsearch', {
        status: response.status,
        body: body.slice(0, 200),
      });
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.warn('GraphQL query log request to Elasticsearch timed out', { timeoutMs: LOG_TIMEOUT_MS });
      return;
    }
    logger.error('GraphQL query logging error', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractUserContext(contextValue: any): GraphQLQueryLogEntry['user'] {
  const user = contextValue?.user ?? {};
  return {
    id: user.id ?? user.sub ?? user.userId,
    email: user.email ?? user.preferred_username,
    tenant: user.tenantId ?? user.tenant ?? contextValue?.tenantId,
    role: user.role ?? (Array.isArray(user.roles) ? user.roles.join(',') : user.roles),
  };
}

export function queryLoggingPlugin(): ApolloServerPlugin {
  const elasticUrl = process.env.GRAPHQL_QUERY_LOGS_URL || process.env.ELASTICSEARCH_URL;
  const elasticIndex = process.env.GRAPHQL_QUERY_LOGS_INDEX || FALLBACK_ELASTIC_INDEX;
  const loggingEnabled = process.env.GRAPHQL_QUERY_LOGS_ENABLED !== 'false';

  if (!loggingEnabled) {
    logger.info('GraphQL query logging plugin disabled via GRAPHQL_QUERY_LOGS_ENABLED=false');
  }

  return {
    async requestDidStart(requestContext): Promise<GraphQLRequestListener<any>> {
      if (!loggingEnabled) {
        return {};
      }

      const startTime = process.hrtime.bigint();
      const startTimestamp = Date.now();
      const sanitizedQuery = sanitizeQuery(requestContext.request.query ?? null);
      const span = tracer.startSpan(
        'graphql.request',
        {
          kind: SpanKind.SERVER,
          attributes: {
            'graphql.document': sanitizedQuery ?? '',
            'graphql.operation.name': requestContext.request.operationName ?? 'anonymous',
          },
        },
        otelContext.active(),
      );

      const variablesSummary = summarizeVariables(requestContext.request.variables);
      const userContext = extractUserContext(requestContext.contextValue);

      span.setAttributes({
        'graphql.variables.count': Object.keys(variablesSummary).length,
        'enduser.id': userContext.id ?? 'anonymous',
        'enduser.role': userContext.role ?? 'unknown',
        'enduser.email': userContext.email ?? 'unknown',
      });

      let operationName = requestContext.request.operationName ?? null;
      let operationType: string | null = null;
      let rootFields: string[] = [];
      let errors: GraphQLFormattedError[] = [];

      return {
        didResolveOperation(ctx) {
          operationName = ctx.operationName ?? ctx.request.operationName ?? null;
          operationType = ctx.operation?.operation ?? null;
          rootFields = rootFieldsFromOperation(ctx.operation ?? undefined);
          span.setAttributes({
            'graphql.operation.type': operationType ?? 'unknown',
            'graphql.root_fields': rootFields.join(','),
          });
        },
        didEncounterErrors(ctx) {
          errors = ctx.errors ?? [];
          errors.forEach((error) => {
            span.recordException(error);
          });
          span.setStatus({ code: SpanStatusCode.ERROR });
        },
        async willSendResponse(ctx) {
          const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
          span.setAttribute('graphql.duration_ms', durationMs);
          if (!errors.length) {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          const request = ctx.request.http;
          const logEntry: GraphQLQueryLogEntry = {
            '@timestamp': new Date(startTimestamp).toISOString(),
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId,
            durationMs,
            status: errors.length ? 'error' : 'ok',
            requestId: ctx.contextValue?.reqId || request?.headers.get('x-request-id') || undefined,
            http: {
              method: request?.method,
              path: request?.url,
              userAgent: request?.headers.get('user-agent') ?? undefined,
              ip: ctx.contextValue?.ip || ctx.contextValue?.request?.ip,
            },
            operation: {
              name: operationName,
              type: operationType,
              rootFields,
              document: sanitizedQuery,
            },
            variables: variablesSummary,
            user: userContext,
            errors: errors.length
              ? errors.map((error) => ({
                  message: error.message,
                  path: error.path,
                  extensions: error.extensions,
                }))
              : undefined,
          };

          await sendToElasticsearch(logEntry, elasticUrl, elasticIndex);

          span.addEvent('graphql.query.logged', {
            'graphql.duration_ms': durationMs,
            'graphql.operation.name': operationName ?? 'anonymous',
            'graphql.operation.type': operationType ?? 'unknown',
            'graphql.log.index': elasticIndex,
          });
          span.end();
        },
      };
    },
  };
}
