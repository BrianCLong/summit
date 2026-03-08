"use strict";
/**
 * Safe Analytics Workbench - Logger
 *
 * Structured logging utility with support for context propagation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    serviceName = 'safe-analytics-workbench';
    context = {};
    minLevel = LogLevel.INFO;
    constructor() {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase();
        if (envLevel && Object.values(LogLevel).includes(envLevel)) {
            this.minLevel = envLevel;
        }
    }
    /**
     * Set global context that will be included in all log entries
     */
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    /**
     * Create a child logger with additional context
     */
    child(context) {
        const childLogger = new Logger();
        childLogger.context = { ...this.context, ...context };
        childLogger.minLevel = this.minLevel;
        return childLogger;
    }
    debug(message, context) {
        this.log(LogLevel.DEBUG, message, context);
    }
    info(message, context) {
        this.log(LogLevel.INFO, message, context);
    }
    warn(message, context) {
        this.log(LogLevel.WARN, message, context);
    }
    error(message, error, context) {
        const errorInfo = error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            }
            : undefined;
        this.log(LogLevel.ERROR, message, context, errorInfo);
    }
    /**
     * Log with timing information
     */
    timed(message, fn, context) {
        const start = Date.now();
        const result = fn();
        if (result instanceof Promise) {
            return result.then((value) => {
                this.log(LogLevel.INFO, message, context, undefined, Date.now() - start);
                return value;
            }, (error) => {
                this.log(LogLevel.ERROR, message, context, {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                }, Date.now() - start);
                throw error;
            });
        }
        this.log(LogLevel.INFO, message, context, undefined, Date.now() - start);
        return result;
    }
    log(level, message, context, error, durationMs) {
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            message,
            context: { ...this.context, ...context },
            error,
            durationMs,
        };
        // Remove undefined values
        if (!entry.context || Object.keys(entry.context).length === 0) {
            delete entry.context;
        }
        if (!entry.error) {
            delete entry.error;
        }
        if (entry.durationMs === undefined) {
            delete entry.durationMs;
        }
        const output = JSON.stringify(entry);
        switch (level) {
            case LogLevel.ERROR:
                console.error(output);
                break;
            case LogLevel.WARN:
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    }
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levels.indexOf(level) >= levels.indexOf(this.minLevel);
    }
}
exports.logger = new Logger();
