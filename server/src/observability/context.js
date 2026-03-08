"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.context = void 0;
exports.runWithContext = runWithContext;
exports.getContext = getContext;
exports.getCorrelationId = getCorrelationId;
exports.getTenantId = getTenantId;
const async_hooks_1 = require("async_hooks");
const contextStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * Runs a function within a given request context.
 */
function runWithContext(context, fn) {
    return contextStorage.run(context, fn);
}
/**
 * Gets the current request context.
 * Returns undefined if called outside of a context.
 */
function getContext() {
    return contextStorage.getStore();
}
/**
 * Gets the current correlation ID.
 * Returns a generated fallback if context is missing (though ideally should not happen in request path).
 */
function getCorrelationId() {
    const ctx = getContext();
    return ctx?.correlationId;
}
/**
 * Gets the current tenant ID.
 */
function getTenantId() {
    const ctx = getContext();
    return ctx?.tenantId;
}
exports.context = {
    run: runWithContext,
    get: getContext,
    getCorrelationId,
    getTenantId,
};
