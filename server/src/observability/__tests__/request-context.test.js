"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const correlation_id_js_1 = require("../../middleware/correlation-id.js");
const request_context_js_1 = require("../request-context.js");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('requestContextMiddleware', () => {
    test('propagates correlation ID and exposes context to log mixins', async () => {
        const app = (0, express_1.default)();
        app.use(correlation_id_js_1.correlationIdMiddleware);
        app.use(request_context_js_1.requestContextMiddleware);
        app.get('/health', (req, res) => {
            const context = (0, request_context_js_1.getRequestContext)();
            request_context_js_1.appLogger.info({ message: 'test-log' });
            res.json({
                correlationId: req.correlationId,
                traceId: context?.traceId,
                spanId: context?.spanId,
            });
        });
        const server = app.listen(0, '127.0.0.1');
        try {
            const response = await (0, supertest_1.default)(server)
                .get('/health')
                .set('x-correlation-id', 'corr-test-123');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.correlationId).toBe('corr-test-123');
            (0, globals_1.expect)(response.headers['x-correlation-id']).toBe('corr-test-123');
        }
        finally {
            server.close();
        }
    });
});
