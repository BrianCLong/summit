import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';
import type { GraphQLContext } from '../graphql/context.js';

const tracer = trace.getTracer('services-api.graphql');

export interface ResolverSpanAttributes {
  operation: string;
  entityId?: string;
  investigationId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export function withResolverSpan<T>(
  name: string,
  context: GraphQLContext,
  attributes: ResolverSpanAttributes,
  handler: (span: Span) => Promise<T>,
): Promise<T> {
  const tenantId = attributes.tenantId || context.tenant?.id || context.user?.tenantId || 'unknown';

  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes({
      'graphql.operation': attributes.operation,
      'tenant.id': tenantId,
      ...attributes,
    });

    try {
      const result = await handler(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message });
      throw error;
    } finally {
      span.end();
    }
  });
}

export { tracer };
