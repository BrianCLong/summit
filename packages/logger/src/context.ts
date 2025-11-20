/**
 * Async context for correlation ID tracking
 * Uses AsyncLocalStorage to maintain correlation IDs across async operations
 */
import { AsyncLocalStorage } from 'async_hooks';
import { LogMetadata } from './types.js';

interface LogContext extends LogMetadata {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
}

// AsyncLocalStorage for maintaining context across async operations
const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

/**
 * Get the current log context
 */
export function getLogContext(): LogContext {
  return asyncLocalStorage.getStore() || {};
}

/**
 * Set the log context for the current async scope
 */
export function setLogContext(context: LogContext): void {
  const currentContext = getLogContext();
  const store = asyncLocalStorage.getStore();

  if (store) {
    Object.assign(store, context);
  }
}

/**
 * Run a function with a specific log context
 */
export function runWithContext<T>(
  context: LogContext,
  fn: () => T
): T {
  const mergedContext = { ...getLogContext(), ...context };
  return asyncLocalStorage.run(mergedContext, fn);
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId(): string | undefined {
  return getLogContext().correlationId;
}

/**
 * Set the correlation ID for the current context
 */
export function setCorrelationId(correlationId: string): void {
  setLogContext({ correlationId });
}

/**
 * Get the current user ID from context
 */
export function getUserId(): string | undefined {
  return getLogContext().userId;
}

/**
 * Set the user ID for the current context
 */
export function setUserId(userId: string): void {
  setLogContext({ userId });
}

/**
 * Get the current tenant ID from context
 */
export function getTenantId(): string | undefined {
  return getLogContext().tenantId;
}

/**
 * Set the tenant ID for the current context
 */
export function setTenantId(tenantId: string): void {
  setLogContext({ tenantId });
}

/**
 * Clear the current log context
 */
export function clearLogContext(): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    Object.keys(store).forEach(key => delete store[key]);
  }
}

/**
 * Create a child logger that includes the current context
 */
export function withContext<T extends (...args: any[]) => any>(
  fn: T
): T {
  return ((...args: any[]) => {
    const context = getLogContext();
    return runWithContext(context, () => fn(...args));
  }) as T;
}
