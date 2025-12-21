import { AsyncLocalStorage } from 'node:async_hooks';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  component?: string;
}

const contextStorage = new AsyncLocalStorage<LogContext>();

export function bindLogContext<T>(context: LogContext, fn: () => T): T {
  return contextStorage.run({ ...contextStorage.getStore(), ...context }, fn);
}

export function setLogContext(context: Partial<LogContext>): void {
  const current = contextStorage.getStore() ?? {};
  contextStorage.enterWith({ ...current, ...context });
}

export function getLogContext(): LogContext {
  return contextStorage.getStore() ?? {};
}
