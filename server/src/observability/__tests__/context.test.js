"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const context_js_1 = require("../context.js");
(0, globals_1.describe)('Observability Context', () => {
    (0, globals_1.it)('should return undefined when outside context', () => {
        (0, globals_1.expect)(context_js_1.context.get()).toBeUndefined();
        (0, globals_1.expect)(context_js_1.context.getCorrelationId()).toBeUndefined();
    });
    (0, globals_1.it)('should store and retrieve context', () => {
        const ctx = {
            correlationId: 'test-correlation-id',
            tenantId: 'test-tenant',
            requestId: 'test-request',
        };
        context_js_1.context.run(ctx, () => {
            (0, globals_1.expect)(context_js_1.context.get()).toEqual(ctx);
            (0, globals_1.expect)(context_js_1.context.getCorrelationId()).toBe('test-correlation-id');
            (0, globals_1.expect)(context_js_1.context.getTenantId()).toBe('test-tenant');
        });
    });
    (0, globals_1.it)('should isolate contexts', () => {
        const ctx1 = { correlationId: 'id-1' };
        const ctx2 = { correlationId: 'id-2' };
        context_js_1.context.run(ctx1, () => {
            (0, globals_1.expect)(context_js_1.context.getCorrelationId()).toBe('id-1');
            context_js_1.context.run(ctx2, () => {
                (0, globals_1.expect)(context_js_1.context.getCorrelationId()).toBe('id-2');
            });
            (0, globals_1.expect)(context_js_1.context.getCorrelationId()).toBe('id-1');
        });
    });
});
