"use strict";
/**
 * Usage examples for @intelgraph/logger
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = __importStar(require("./index.js"));
// Example 1: Basic logger creation
const logger = (0, index_js_1.default)({
    serviceName: 'summit-api',
    level: 'info',
});
logger.info('Application starting');
logger.info({ port: 4000 }, 'Server listening');
// Example 2: Structured logging with context
logger.info({
    userId: 'user-123',
    action: 'create_investigation',
    investigationId: 'inv-456',
}, 'Investigation created');
// Example 3: Error logging
try {
    throw new Error('Something went wrong');
}
catch (error) {
    logger.error({ err: error }, 'Failed to process request');
}
// Example 4: Child logger with context
const requestLogger = (0, index_js_1.createChildLogger)(logger, {
    requestId: 'req-789',
    userId: 'user-123',
    tenantId: 'tenant-abc',
});
requestLogger.info('Processing request');
requestLogger.warn('Request took longer than expected');
// Example 5: Express middleware
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use((0, index_js_1.createLogMiddleware)(logger));
app.get('/api/health', (req, res) => {
    // req.log is automatically populated with request context
    req.log.info('Health check requested');
    res.json({ status: 'ok' });
});
// Example 6: Log with OpenTelemetry span
(0, index_js_1.logWithSpan)(logger, index_js_1.LogLevel.INFO, 'Database query executed', {
    query: 'SELECT * FROM entities',
    duration: 150,
    rowCount: 42,
});
// Example 7: Different log levels
logger.trace('Very detailed debugging information');
logger.debug('Debugging information');
logger.info('Informational message');
logger.warn('Warning message');
logger.error('Error occurred');
logger.fatal('Fatal error, application will exit');
// Example 8: Automatic trace correlation
// When running inside an OpenTelemetry instrumented service,
// all logs automatically include traceId and spanId
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('summit-api');
const span = tracer.startSpan('process-request');
// Logs inside this span will automatically have traceId and spanId
logger.info('This log will include trace context');
span.end();
// Example 9: Redacting sensitive data
const sensitiveLogger = (0, index_js_1.default)({
    serviceName: 'auth-service',
    redact: ['password', 'token', 'ssn', 'creditCard'],
});
// Password will be redacted from logs
sensitiveLogger.info({
    username: 'john.doe',
    password: 'super-secret', // This will be [Redacted]
    action: 'login',
}, 'User login attempt');
