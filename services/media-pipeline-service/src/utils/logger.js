"use strict";
/**
 * Structured Logger for Media Pipeline Service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
exports.createRequestLogger = createRequestLogger;
const pino_1 = __importDefault(require("pino"));
const index_js_1 = __importDefault(require("../config/index.js"));
const transport = index_js_1.default.nodeEnv === 'development'
    ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    }
    : undefined;
exports.logger = (0, pino_1.default)({
    name: 'media-pipeline-service',
    level: index_js_1.default.logLevel,
    transport,
    base: {
        service: 'media-pipeline-service',
        env: index_js_1.default.nodeEnv,
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
});
/**
 * Create a child logger with additional context
 */
function createChildLogger(context) {
    return exports.logger.child(context);
}
/**
 * Create a request-scoped logger
 */
function createRequestLogger(correlationId, additionalContext) {
    return exports.logger.child({
        correlationId,
        ...additionalContext,
    });
}
exports.default = exports.logger;
