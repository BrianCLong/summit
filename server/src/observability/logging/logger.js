"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.getRequestLogger = getRequestLogger;
const logger_js_1 = require("../../config/logger.js");
const context_js_1 = require("../context.js");
/**
 * Enhanced Logger that automatically injects context (correlationId, tenantId)
 * from AsyncLocalStorage if available.
 */
class ContextAwareLogger {
    baseLogger;
    constructor(baseLogger = logger_js_1.logger) {
        this.baseLogger = baseLogger;
    }
    getMeta(userMeta) {
        const ctx = (0, context_js_1.getContext)();
        const meta = { ...userMeta };
        if (ctx) {
            if (ctx.correlationId)
                meta.correlationId = ctx.correlationId;
            if (ctx.tenantId)
                meta.tenantId = ctx.tenantId;
            if (ctx.requestId)
                meta.requestId = ctx.requestId;
        }
        return meta;
    }
    debug(msg, meta) {
        this.baseLogger.debug(this.getMeta(meta), msg);
    }
    info(msg, meta) {
        this.baseLogger.info(this.getMeta(meta), msg);
    }
    warn(msg, meta) {
        this.baseLogger.warn(this.getMeta(meta), msg);
    }
    error(msg, meta) {
        this.baseLogger.error(this.getMeta(meta), msg);
    }
    child(bindings) {
        return new ContextAwareLogger(this.baseLogger.child(bindings));
    }
}
exports.logger = new ContextAwareLogger();
/**
 * Creates a logger instance pre-bound to specific context.
 * Useful if you want to explicitly pass context instead of relying on ALS.
 */
function getRequestLogger(ctx) {
    const bindings = {
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
    };
    // Create a child of the root pino logger with these bindings
    const childPino = logger_js_1.logger.child(bindings);
    return new ContextAwareLogger(childPino);
}
