import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  correlationId: string;
  tenantId?: string;
  principal?: {
    id: string;
    role?: string;
    orgId?: string;
  };
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

const contextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs a function within a given request context.
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

/**
 * Gets the current request context.
 * Returns undefined if called outside of a context.
 */
export function getContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

/**
 * Gets the current correlation ID.
 * Returns a generated fallback if context is missing (though ideally should not happen in request path).
 */
export function getCorrelationId(): string | undefined {
  const ctx = getContext();
  return ctx?.correlationId;
}

/**
 * Gets the current tenant ID.
 */
export function getTenantId(): string | undefined {
  const ctx = getContext();
  return ctx?.tenantId;
}

export const context = {
  run: runWithContext,
  get: getContext,
  getCorrelationId,
  getTenantId,
};
