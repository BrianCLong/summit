import { logger as rootLogger } from '../../config/logger.js';
import { getContext, RequestContext } from '../context.js';

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Enhanced Logger that automatically injects context (correlationId, tenantId)
 * from AsyncLocalStorage if available.
 */
class ContextAwareLogger implements Logger {
  constructor(private baseLogger: typeof rootLogger = rootLogger) {}

  private getMeta(userMeta?: Record<string, unknown>): Record<string, unknown> {
    const ctx = getContext();
    const meta: Record<string, unknown> = { ...userMeta };

    if (ctx) {
      if (ctx.correlationId) meta.correlationId = ctx.correlationId;
      if (ctx.tenantId) meta.tenantId = ctx.tenantId;
      if (ctx.requestId) meta.requestId = ctx.requestId;
    }

    return meta;
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.baseLogger.debug(this.getMeta(meta), msg);
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    this.baseLogger.info(this.getMeta(meta), msg);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    this.baseLogger.warn(this.getMeta(meta), msg);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    this.baseLogger.error(this.getMeta(meta), msg);
  }

  child(bindings: Record<string, unknown>): Logger {
      return new ContextAwareLogger(this.baseLogger.child(bindings));
  }
}

export const logger = new ContextAwareLogger();

/**
 * Creates a logger instance pre-bound to specific context.
 * Useful if you want to explicitly pass context instead of relying on ALS.
 */
export function getRequestLogger(ctx: RequestContext): Logger {
  const bindings: Record<string, unknown> = {
    correlationId: ctx.correlationId,
    tenantId: ctx.tenantId,
  };
  // Create a child of the root pino logger with these bindings
  const childPino = rootLogger.child(bindings);
  return new ContextAwareLogger(childPino);
}
