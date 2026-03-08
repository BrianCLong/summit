"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = void 0;
const pino_http_1 = __importDefault(require("pino-http"));
const pino_1 = __importDefault(require("pino"));
const crypto_1 = require("crypto");
const pinoHttp = pino_http_1.default.default || pino_http_1.default;
const logger = pino_1.default();
exports.loggingMiddleware = pinoHttp({
    logger,
    // Redact sensitive headers
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    // Inject custom properties into the log object
    customProps: (req, res) => {
        return {
            correlationId: req.correlationId || req.headers['x-correlation-id'],
            traceId: req.traceId,
            spanId: req.spanId,
            // Extract User ID if available (populated by auth middleware or token inspection)
            userId: req.user?.sub || req.user?.id || 'anonymous',
            tenantId: req.user?.tenant_id,
            // Ensure request ID is present (pino-http generates 'req.id' by default but we map it explicitly if needed)
            requestId: req.id || req.headers['x-request-id'] || (0, crypto_1.randomUUID)(),
        };
    },
    // Custom generator for Request ID
    genReqId: (req) => {
        return req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
    },
    // Customize the log level based on response status
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) {
            return 'error';
        }
        if (res.statusCode >= 400) {
            return 'warn';
        }
        return 'info';
    },
    // Custom success message
    customSuccessMessage: (req, res) => {
        if (res.statusCode === 404) {
            return 'Resource not found';
        }
        return `${req.method} ${req.url} completed`;
    },
});
