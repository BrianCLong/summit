"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOtel = startOtel;
exports.isOtelStarted = isOtelStarted;
exports.getTracer = getTracer;
// @ts-nocheck
const logger_js_1 = require("./config/logger.js");
const tracer_js_1 = require("./observability/tracer.js");
// Legacy OpenTelemetry entry point - redirects to new tracer implementation
// Maintained for backward compatibility and to satisfy build requirements
let started = false;
async function startOtel() {
    if (started)
        return;
    // If explicitly disabled via env var
    if (process.env.ENABLE_OTEL === 'false') {
        logger_js_1.logger.info('Observability (OTel) explicitly disabled via env.');
        return;
    }
    started = true;
    try {
        logger_js_1.logger.info('Starting OpenTelemetry SDK (via Tracer wrapper)...');
        const tracer = (0, tracer_js_1.initializeTracing)();
        await tracer.initialize();
        logger_js_1.logger.info('OpenTelemetry SDK started successfully.');
    }
    catch (error) {
        logger_js_1.logger.warn('Failed to start OpenTelemetry SDK', {
            error: error.message,
        });
    }
}
function isOtelStarted() {
    return started;
}
function getTracer(_name) {
    return (0, tracer_js_1.getTracer)();
}
