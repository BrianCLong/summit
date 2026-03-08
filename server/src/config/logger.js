"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.correlationStorage = void 0;
const pino_1 = __importDefault(require("pino"));
const config_js_1 = require("../config.js");
const async_hooks_1 = require("async_hooks");
const correlation_engine_js_1 = require("../lib/telemetry/correlation-engine.js");
// AsyncLocalStorage for correlation ID propagation
exports.correlationStorage = new async_hooks_1.AsyncLocalStorage();
const REDACT_PATHS = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-auth-token"]',
    'req.headers["x-api-key"]',
    'body.password',
    'body.token',
    'body.refreshToken',
    'body.secret',
    'password',
    'token',
    'secret',
    'user.email',
    'user.phone',
];
const stream = {
    write: (msg) => {
        if (msg.trim().startsWith('{')) {
            try {
                const logEntry = JSON.parse(msg);
                correlation_engine_js_1.correlationEngine.ingestLog(logEntry);
            }
            catch (e) { }
        }
        process.stdout.write(msg);
    },
};
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        service: 'intelgraph-server',
        env: config_js_1.cfg.NODE_ENV,
        version: process.env.npm_package_version || 'unknown',
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]',
    },
    mixin() {
        const store = exports.correlationStorage.getStore();
        if (store) {
            return {
                correlationId: store.get('correlationId'),
                tenantId: store.get('tenantId'),
                principalId: store.get('principalId'),
                requestId: store.get('requestId'),
                traceId: store.get('traceId'),
                role: store.get('role'),
            };
        }
        return {};
    },
    formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
        bindings: (bindings) => ({
            pid: bindings.pid,
            host: bindings.hostname,
        }),
    },
}, stream);
exports.default = exports.logger;
