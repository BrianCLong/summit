"use strict";
/**
 * Request Logger Middleware
 * HTTP request logging using pino
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.requestLogger = void 0;
const pino_http_1 = __importDefault(require("pino-http"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({
    name: 'kb-service',
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
            },
        },
    }),
});
exports.logger = logger;
exports.requestLogger = (0, pino_http_1.default)({
    logger,
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) {
            return 'error';
        }
        if (res.statusCode >= 400) {
            return 'warn';
        }
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
    },
    // Don't log health checks at info level
    autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/health/ready',
    },
});
