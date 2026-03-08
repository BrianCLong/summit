"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tracer_js_1 = require("../observability/tracer.js");
const router = express_1.default.Router();
/**
 * @openapi
 * /tracing/status:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Get tracing status
 *     description: Returns the status of the distributed tracing system.
 *     responses:
 *       200:
 *         description: Tracing status
 */
router.get('/status', (req, res) => {
    const tracer = (0, tracer_js_1.getTracer)();
    const span = tracer.getCurrentSpan();
    res.json({
        enabled: true, // Assuming enabled if initialized
        initialized: tracer.isInitialized(),
        currentTraceId: span ? span.spanContext().traceId : null,
        currentSpanId: span ? span.spanContext().spanId : null,
        provider: 'OpenTelemetry',
        exporter: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ? 'OTLP' : (process.env.JAEGER_ENDPOINT ? 'Jaeger' : 'Console/None')
    });
});
exports.default = router;
