// Conductor Observability Module (No-op Tracing Shim)
// Provides metric recording and optional no-op tracing helpers without OTEL deps
import { conductorMetrics } from '../metrics';
import { ExpertType } from '../types';

// Local no-op tracer shim
const tracer = {
  startSpan: (_name: string, _opts?: any) => ({
    setAttributes: (_a?: any) => {},
    setStatus: (_s?: any) => {},
    recordException: (_e?: any) => {},
    end: () => {},
  }),
};

// Minimal placeholders for kinds
const SpanKind = { INTERNAL: 'internal', CLIENT: 'client', SERVER: 'server' } as const;

export interface ConductorSpanAttributes {
  'conductor.decision_id': string;
  'conductor.expert': string;
  'conductor.task_hash'?: string;
  'conductor.features'?: string;
  'conductor.confidence'?: number;
  'conductor.user_id'?: string;
  'conductor.tenant_id'?: string;
  'conductor.investigation_id'?: string;
  'conductor.policy_version'?: string;
  'conductor.quota_remaining'?: number;
  'conductor.scopes'?: string;
}

export interface MCPSpanAttributes {
  'mcp.server': string;
  'mcp.tool': string;
  'mcp.operation': string;
  'mcp.request_id'?: string;
  'mcp.auth_scopes'?: string;
}

/**
 * Create a span for conductor routing decisions
 */
export function createRoutingSpan(
  decisionId: string,
  taskInput: string,
  attributes: Partial<ConductorSpanAttributes> = {},
) {
  return tracer.startSpan('conductor.routing.decide', {
    attributes: {
      'conductor.decision_id': decisionId,
      'conductor.task_hash': hashTask(taskInput),
      'conductor.operation': 'routing_decision',
      ...attributes,
    },
  });
}

/**
 * Create a span for expert execution
 */
export function createExpertExecutionSpan(
  expert: ExpertType,
  decisionId: string,
  attributes: Partial<ConductorSpanAttributes> = {},
) {
  return tracer.startSpan(`conductor.expert.${expert.toLowerCase()}`, {
    attributes: {
      'conductor.expert': expert,
      'conductor.decision_id': decisionId,
      'conductor.operation': 'expert_execution',
      ...attributes,
    },
  });
}

/**
 * Create a span for MCP tool execution
 */
export function createMCPToolSpan(
  serverName: string,
  toolName: string,
  operation: string,
  attributes: Partial<MCPSpanAttributes> = {},
) {
  return tracer.startSpan(`conductor.mcp.${toolName}`, {
    attributes: {
      'mcp.server': serverName,
      'mcp.tool': toolName,
      'mcp.operation': operation,
      'mcp.protocol': 'json-rpc-2.0',
      ...attributes,
    },
  });
}

/**
 * Create a span for conductor security checks
 */
export function createSecurityCheckSpan(
  checkType: string,
  attributes: Partial<ConductorSpanAttributes> = {},
) {
  return tracer.startSpan(`conductor.security.${checkType}`, {
    attributes: {
      'conductor.security_check': checkType,
      'conductor.operation': 'security_validation',
      ...attributes,
    },
  });
}

/**
 * Record routing decision with metrics and tracing
 */
export function recordRoutingDecision(
  decisionId: string,
  expert: ExpertType,
  confidence: number,
  features: any,
  latencyMs: number,
  success: boolean,
  error?: Error,
) {
  const span = createRoutingSpan(decisionId, '', {
    'conductor.expert': expert,
    'conductor.confidence': confidence,
    'conductor.features': JSON.stringify(features),
  });

  try {
    // Record metrics
    conductorMetrics.recordRoutingDecision(expert, latencyMs, success);

    // Set span attributes
    span.setAttributes({
      'conductor.routing.latency_ms': latencyMs,
      'conductor.routing.success': success,
      'conductor.routing.expert_chosen': expert,
      'conductor.routing.confidence_score': confidence,
    });

    if (error) {
      span.recordException?.(error);
      span.setStatus?.({ message: error.message });
    } else {
      span.setStatus?.({});
    }
  } finally {
    span.end?.();
  }
}

/**
 * Record expert execution with comprehensive telemetry
 */
export function recordExpertExecution(
  expert: ExpertType,
  decisionId: string,
  latencyMs: number,
  cost: number,
  success: boolean,
  result?: any,
  error?: Error,
  attributes: Partial<ConductorSpanAttributes> = {},
) {
  const span = createExpertExecutionSpan(expert, decisionId, attributes);

  try {
    // Record metrics
    conductorMetrics.recordExpertExecution(expert, latencyMs, cost, success);

    // Set span attributes
    span.setAttributes({
      'conductor.execution.latency_ms': latencyMs,
      'conductor.execution.cost_usd': cost,
      'conductor.execution.success': success,
      'conductor.execution.result_size': result ? JSON.stringify(result).length : 0,
    });

    // Add result summary for successful executions
    if (success && result) {
      span.setAttributes({
        'conductor.execution.result_type': typeof result,
        'conductor.execution.has_result': true,
      });
    }

    if (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
  } finally {
    span.end();
  }
}

/**
 * Record MCP operation with tracing and metrics
 */
export function recordMCPOperation(
  serverName: string,
  toolName: string,
  operation: string,
  latencyMs: number,
  success: boolean,
  error?: Error,
  attributes: Partial<MCPSpanAttributes> = {},
) {
  const span = createMCPToolSpan(serverName, toolName, operation, attributes);

  try {
    // Record metrics
    conductorMetrics.recordMCPOperation(serverName, toolName, latencyMs, success);

    // Set span attributes
    span.setAttributes({
      'mcp.operation.latency_ms': latencyMs,
      'mcp.operation.success': success,
      'mcp.operation.type': operation,
    });

    if (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
  } finally {
    span.end();
  }
}

/**
 * Record security event with telemetry
 */
export function recordSecurityEvent(
  eventType: string,
  success: boolean,
  details?: any,
  error?: Error,
  attributes: Partial<ConductorSpanAttributes> = {},
) {
  const span = createSecurityCheckSpan(eventType, attributes);

  try {
    // Record metrics
    conductorMetrics.recordSecurityEvent(eventType, success);

    // Set span attributes
    span.setAttributes({
      'conductor.security.event_type': eventType,
      'conductor.security.allowed': success,
      'conductor.security.details': details ? JSON.stringify(details) : '',
    });

    if (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
  } finally {
    span.end();
  }
}

/**
 * Instrumented wrapper for async operations
 */
export async function withConductorSpan<T>(
  spanName: string,
  operation: (span: any) => Promise<T>,
  attributes: Record<string, any> = {},
): Promise<T> {
  const span = tracer.startSpan(spanName, { attributes });

  try {
    const result = await operation(span);
    span.setStatus?.({});
    return result;
  } catch (error) {
    if (error instanceof Error) {
      span.recordException?.(error);
      span.setStatus?.({ message: error.message });
    }
    throw error;
  } finally {
    span.end?.();
  }
}

/**
 * Get current trace context for propagation
 */
export function getCurrentTraceContext() {
  return null;
}

/**
 * Create a trace link for external systems (like alerting)
 */
export function createTraceLink(
  baseUrl: string = process.env.TEMPO_BASE_URL || 'http://localhost:3000',
): string | null {
  const traceContext = getCurrentTraceContext();
  if (!traceContext) return null;

  return `${baseUrl}/trace/${traceContext.traceId}`;
}

/**
 * Hash task input for consistent tracing
 */
function hashTask(taskInput: string): string {
  let hash = 0;
  for (let i = 0; i < taskInput.length; i++) {
    const char = taskInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Middleware for Express routes to add conductor tracing
 */
export function conductorTracingMiddleware() {
  return (req: any, res: any, next: any) => {
    const span = tracer.startSpan(`conductor.http.${req.method} ${req.path}`, {
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.path,
        'http.user_agent': req.get('user-agent'),
        'conductor.request_id': req.id || 'unknown',
      },
    });

    // Add trace context to response headers
    const traceContext = getCurrentTraceContext();
    if (traceContext) {
      res.set('X-Trace-Id', traceContext.traceId);
      res.set('X-Span-Id', traceContext.spanId);
    }

    // Wrap response end to capture metrics
    const originalEnd = res.end.bind(res);
    (res as any).end = (chunk: any, encoding?: any) => {
      span.setAttributes?.({
        'http.status_code': res.statusCode,
        'conductor.response_size': chunk ? chunk.length : 0,
      });

      if (res.statusCode >= 400) {
        span.setStatus?.({ message: `HTTP ${res.statusCode}` });
      } else {
        span.setStatus?.({});
      }

      span.end?.();
      return originalEnd(chunk, encoding);
    };

    next();
  };
}

/**
 * Apollo Server plugin for GraphQL conductor operations
 */
export function createConductorGraphQLPlugin() {
  return {
    requestDidStart() {
      return {
        willSendResponse(requestContext: any) {
          // Add trace context to GraphQL responses
          if (requestContext.response.http) {
            const traceContext = getCurrentTraceContext();
            if (traceContext) {
              requestContext.response.http.headers.set('X-Trace-Id', traceContext.traceId);
              requestContext.response.http.headers.set('X-Span-Id', traceContext.spanId);
            }
          }
        },

        didResolveOperation(requestContext: any) {
          const { operationName } = requestContext.request;

          if (operationName === 'conduct' || operationName === 'previewRouting') {
            const span = null as any;
            if (span) {
              span.setAttributes?.({
                'conductor.graphql.operation': operationName,
                'conductor.graphql.variables_count': Object.keys(
                  requestContext.request.variables || {},
                ).length,
                'conductor.user_id': requestContext.contextValue?.user?.id || 'anonymous',
              });
            }
          }
        },

        didEncounterErrors(requestContext: any) {
          const { operationName } = requestContext.request;

          if (operationName === 'conduct' || operationName === 'previewRouting') {
            const span = null as any;
            if (span) {
              requestContext.errors.forEach((error: any) => {
                span.recordException?.(error);
                span.setAttributes?.({
                  'conductor.graphql.error': error.message,
                  'conductor.graphql.error_path': error.path?.join('.') || 'unknown',
                });
              });
              span.setStatus?.({});
            }
          }
        },
      };
    },
  };
}
