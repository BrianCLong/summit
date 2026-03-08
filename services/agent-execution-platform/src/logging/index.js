"use strict";
/**
 * Comprehensive Logging Framework
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.StructuredLogger = exports.LogStore = exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
class Logger {
    logger;
    context;
    constructor(context = {}) {
        this.context = context;
        this.logger = this.createLogger();
    }
    createLogger() {
        const format = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
        return winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format,
            defaultMeta: this.context,
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
                }),
            ],
        });
    }
    trace(message, metadata) {
        this.log('trace', message, metadata);
    }
    debug(message, metadata) {
        this.log('debug', message, metadata);
    }
    info(message, metadata) {
        this.log('info', message, metadata);
    }
    warn(message, metadata) {
        this.log('warn', message, metadata);
    }
    error(message, error, metadata) {
        this.log('error', message, { ...metadata, error });
    }
    fatal(message, error, metadata) {
        this.log('fatal', message, { ...metadata, error });
    }
    log(level, message, metadata) {
        const entry = {
            timestamp: new Date(),
            level,
            message,
            context: this.context,
            metadata,
            traceId: this.generateTraceId(),
        };
        this.logger.log(level, message, metadata);
    }
    child(additionalContext) {
        return new Logger({
            ...this.context,
            ...additionalContext,
        });
    }
    generateTraceId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return 'trace_' + timestamp + '_' + random;
    }
}
exports.Logger = Logger;
class LogStore {
    logs = [];
    maxLogs = 10000;
    async store(entry) {
        this.logs.push(entry);
        // Keep only the most recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }
    async query(query) {
        let results = [...this.logs];
        // Filter by time range
        if (query.startTime) {
            results = results.filter((log) => log.timestamp >= query.startTime);
        }
        if (query.endTime) {
            results = results.filter((log) => log.timestamp <= query.endTime);
        }
        // Filter by level
        if (query.level) {
            results = results.filter((log) => log.level === query.level);
        }
        // Filter by context
        if (query.context) {
            results = results.filter((log) => {
                return Object.entries(query.context).every(([key, value]) => log.context[key] === value);
            });
        }
        // Search in message
        if (query.search) {
            const searchLower = query.search.toLowerCase();
            results = results.filter((log) => log.message.toLowerCase().includes(searchLower));
        }
        // Apply pagination
        const offset = query.offset || 0;
        const limit = query.limit || 100;
        return results.slice(offset, offset + limit);
    }
    async clear() {
        this.logs = [];
    }
    getStats() {
        const byLevel = {};
        for (const log of this.logs) {
            byLevel[log.level] = (byLevel[log.level] || 0) + 1;
        }
        return {
            totalLogs: this.logs.length,
            byLevel: byLevel,
        };
    }
}
exports.LogStore = LogStore;
class StructuredLogger {
    logger;
    store;
    constructor(context = {}) {
        this.logger = new Logger(context);
        this.store = new LogStore();
    }
    async logOperation(operation, fn, context) {
        const startTime = Date.now();
        const operationLogger = this.logger.child({ operation, ...context });
        operationLogger.info('Starting operation: ' + operation);
        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            operationLogger.info('Completed operation: ' + operation, {
                durationMs: duration,
                success: true,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            operationLogger.error('Failed operation: ' + operation, error, {
                durationMs: duration,
                success: false,
            });
            throw error;
        }
    }
    getLogger() {
        return this.logger;
    }
    getStore() {
        return this.store;
    }
}
exports.StructuredLogger = StructuredLogger;
// Singleton instance
exports.logger = new StructuredLogger();
