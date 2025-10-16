/**
 * GraphQL Resolver Tracing Utilities
 *
 * Provides manual instrumentation for GraphQL resolvers
 * with custom attributes and error handling
 */

import { context, trace, SpanStatusCode } from '@opentelemetry/api';

// Get the GraphQL tracer
const tracer = trace.getTracer('intelgraph-graphql');

/**
 * Wrapper function for GraphQL resolvers with automatic tracing
 */
export function traceResolver<T extends any[], R>(
  resolverName: string,
  resolver: (...args: T) => Promise<R> | R,
) {
  return async (...args: T): Promise<R> => {
    return await context.with(
      tracer.startActiveSpan(`resolver:${resolverName}`, async (span) => {
        try {
          // Extract common GraphQL context info
          const [parent, resolverArgs, ctx, info] = args as any[];

          // Add span attributes
          span.setAttributes({
            'graphql.resolver.name': resolverName,
            'graphql.operation.type': info?.operation?.operation || 'unknown',
            'graphql.field.name': info?.fieldName || 'unknown',
            'graphql.field.path': info?.path?.key || 'unknown',
            'user.id': ctx?.user?.id || 'anonymous',
            'tenant.id': ctx?.tenant?.id || 'default',
          });

          // Add resolver arguments (be careful with sensitive data)
          if (resolverArgs && typeof resolverArgs === 'object') {
            Object.keys(resolverArgs).forEach((key) => {
              if (
                !['password', 'token', 'secret'].includes(key.toLowerCase())
              ) {
                span.setAttribute(
                  `graphql.args.${key}`,
                  typeof resolverArgs[key] === 'string'
                    ? resolverArgs[key]
                    : JSON.stringify(resolverArgs[key]),
                );
              }
            });
          }

          // Execute the resolver
          const result = await resolver(...args);

          // Add result metadata
          if (Array.isArray(result)) {
            span.setAttribute('graphql.result.count', result.length);
          } else if (result && typeof result === 'object') {
            span.setAttribute('graphql.result.type', 'object');
          }

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          // Record the error
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });

          // Add error attributes
          span.setAttributes({
            'error.name': (error as Error).name,
            'error.message': (error as Error).message,
            'error.stack': (error as Error).stack || 'no stack',
          });

          throw error;
        } finally {
          span.end();
        }
      }),
    );
  };
}

/**
 * Decorator for easy resolver tracing
 */
export function Traced(resolverName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const traceName =
      resolverName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = traceResolver(traceName, originalMethod);
    return descriptor;
  };
}

/**
 * Example usage in resolvers
 */
export const exampleResolvers = {
  Query: {
    // Using wrapper function
    entity: traceResolver(
      'Query.entity',
      async (_: any, args: any, ctx: any) => {
        // Your resolver logic here
        return await ctx.services.entities.get(args.id);
      },
    ),

    // Using manual span creation
    entities: async (_: any, args: any, ctx: any, info: any) => {
      return await context.with(
        tracer.startActiveSpan('resolver:Query.entities', async (span) => {
          span.setAttributes({
            'graphql.resolver.name': 'Query.entities',
            'graphql.args.limit': args.limit || 10,
            'graphql.args.offset': args.offset || 0,
            'user.id': ctx.user?.id || 'anonymous',
          });

          try {
            const entities = await ctx.services.entities.list(args);
            span.setAttribute('graphql.result.count', entities.length);
            span.setStatus({ code: SpanStatusCode.OK });
            return entities;
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: (error as Error).message,
            });
            throw error;
          } finally {
            span.end();
          }
        }),
      );
    },
  },

  Mutation: {
    createEntity: traceResolver(
      'Mutation.createEntity',
      async (_: any, args: any, ctx: any) => {
        // Mutation logic with automatic tracing
        return await ctx.services.entities.create(args.input);
      },
    ),
  },
};

/**
 * Middleware for automatic resolver tracing
 */
export function createTracingMiddleware() {
  return {
    Query: new Proxy(
      {},
      {
        get(target, prop) {
          return traceResolver(`Query.${String(prop)}`, target[prop]);
        },
      },
    ),
    Mutation: new Proxy(
      {},
      {
        get(target, prop) {
          return traceResolver(`Mutation.${String(prop)}`, target[prop]);
        },
      },
    ),
    Subscription: new Proxy(
      {},
      {
        get(target, prop) {
          return traceResolver(`Subscription.${String(prop)}`, target[prop]);
        },
      },
    ),
  };
}
