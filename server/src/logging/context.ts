import { AsyncLocalStorage } from 'async_hooks';
import * as uuid from 'uuid';

const uuidv4 = uuid.v4;

export interface LogContext {
  correlationId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId: string;
  [key: string]: any;
}

const contextStorage = new AsyncLocalStorage<LogContext>();

export const context = {
  /**
   * Run a function within a new context
   */
  run: <T>(store: LogContext, callback: () => T): T => {
    return contextStorage.run(store, callback);
  },

  /**
   * Get the current context
   */
  get: (): LogContext | undefined => {
    return contextStorage.getStore();
  },

  /**
   * Get a specific value from the context
   */
  getValue: (key: keyof LogContext): any => {
    const store = contextStorage.getStore();
    return store ? store[key] : undefined;
  },

  /**
   * Get the correlation ID from the current context
   */
  getCorrelationId: (): string | undefined => {
    const store = contextStorage.getStore();
    return store?.correlationId;
  },

  /**
   * Create a new context from request headers or defaults
   */
  create: (headers: Record<string, any> = {}): LogContext => {
    const correlationId =
      headers['x-correlation-id'] || headers['x-request-id'] || uuidv4();
    const traceId = headers['x-trace-id'] || headers['traceparent'] || uuidv4();
    const spanId = headers['x-span-id'];
    const userId = headers['x-user-id'];

    return {
      correlationId,
      traceId,
      spanId,
      userId,
      requestId: uuidv4(),
    };
  },
};
