"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appLogger = void 0;
exports.getRequestContext = getRequestContext;
exports.requestContextMiddleware = requestContextMiddleware;
const node_async_hooks_1 = require("node:async_hooks");
const node_crypto_1 = require("node:crypto");
const pino_1 = __importDefault(require("pino"));
const correlation_id_js_1 = require("../middleware/correlation-id.js");
const tracer_js_1 = require("./tracer.js");
const contextStorage = new node_async_hooks_1.AsyncLocalStorage();
function getRequestContext() {
    return contextStorage.getStore();
}
exports.appLogger = pino_1.default({
    name: 'intelgraph-observability',
    level: process.env.LOG_LEVEL || 'info',
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'token',
            'secret',
            'api_key',
        ],
        remove: true,
    },
    mixin() {
        const context = getRequestContext();
        return context
            ? {
                correlationId: context.correlationId,
                traceId: context.traceId,
                spanId: context.spanId,
                userId: context.userId,
                tenantId: context.tenantId,
            }
            : {};
    },
});
function requestContextMiddleware(req, res, next) {
    const tracer = (0, tracer_js_1.getTracer)();
    const correlationId = req.correlationId ||
        req.headers[correlation_id_js_1.CORRELATION_ID_HEADER] ||
        req.headers[correlation_id_js_1.REQUEST_ID_HEADER] ||
        (0, node_crypto_1.randomUUID)();
    const traceId = req.traceId || tracer.getTraceId();
    const spanId = req.spanId || tracer.getSpanId();
    const userId = req.user?.sub || req.user?.id;
    const tenantId = req.user?.tenant_id || req.tenant_id;
    req.correlationId = correlationId;
    req.traceId = traceId;
    req.spanId = spanId;
    const context = {
        correlationId,
        traceId,
        spanId,
        userId,
        tenantId,
    };
    contextStorage.run(context, () => {
        res.setHeader(correlation_id_js_1.CORRELATION_ID_HEADER, correlationId);
        res.setHeader(correlation_id_js_1.REQUEST_ID_HEADER, correlationId);
        if (traceId)
            res.setHeader('x-trace-id', traceId);
        next();
    });
}
