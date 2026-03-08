"use strict";
// @ts-nocheck
/**
 * Structured logging utility using Pino
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
exports.createRequestLogger = createRequestLogger;
exports.logPrivacyAudit = logPrivacyAudit;
exports.logQueryMetrics = logQueryMetrics;
const pino_1 = __importDefault(require("pino"));
const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
exports.logger = (0, pino_1.default)({
    name: 'privacy-analytics-service',
    level: isTest ? 'silent' : logLevel,
    transport: !isProduction && !isTest
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    formatters: {
        level: (label) => ({ level: label }),
        bindings: () => ({}),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    base: {
        service: 'privacy-analytics-service',
        version: process.env.npm_package_version || '1.0.0',
    },
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
function createRequestLogger(executionId, tenantId, userId) {
    return exports.logger.child({
        executionId,
        tenantId,
        userId,
    });
}
/**
 * Log privacy audit events
 */
function logPrivacyAudit(executionId, event, details) {
    exports.logger.info({
        type: 'privacy_audit',
        executionId,
        event,
        ...details,
    });
}
/**
 * Log query execution metrics
 */
function logQueryMetrics(executionId, metrics) {
    exports.logger.info({
        type: 'query_metrics',
        executionId,
        ...metrics,
    });
}
