"use strict";
/**
 * Mesh Observability - Structured Logging
 *
 * Provides consistent, structured logging across all mesh services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.createLogger = createLogger;
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class Logger {
    config;
    context = {};
    constructor(config) {
        this.config = config;
        this.context = { service: config.service };
    }
    /**
     * Create a child logger with additional context.
     */
    child(context) {
        const child = new Logger(this.config);
        child.context = { ...this.context, ...context };
        return child;
    }
    /**
     * Log a debug message.
     */
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    /**
     * Log an info message.
     */
    info(message, meta) {
        this.log('info', message, meta);
    }
    /**
     * Log a warning message.
     */
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    /**
     * Log an error message.
     */
    error(message, meta) {
        this.log('error', message, meta);
    }
    /**
     * Log with timing information.
     */
    timed(operation, fn) {
        const start = Date.now();
        const result = fn();
        if (result instanceof Promise) {
            return result.then((value) => {
                this.info(`${operation} completed`, { durationMs: Date.now() - start });
                return value;
            }).catch((error) => {
                this.error(`${operation} failed`, { durationMs: Date.now() - start, error: String(error) });
                throw error;
            });
        }
        this.info(`${operation} completed`, { durationMs: Date.now() - start });
        return result;
    }
    log(level, message, meta) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: { ...this.context, ...meta },
        };
        // Extract error if present
        if (meta?.error instanceof Error) {
            entry.error = {
                name: meta.error.name,
                message: meta.error.message,
                stack: meta.error.stack,
            };
            delete entry.context.error;
        }
        if (this.config.output) {
            this.config.output(entry);
        }
        else if (this.config.pretty) {
            this.prettyPrint(entry);
        }
        else {
            console.log(JSON.stringify(entry));
        }
    }
    prettyPrint(entry) {
        const levelColors = {
            debug: '\x1b[36m', // cyan
            info: '\x1b[32m', // green
            warn: '\x1b[33m', // yellow
            error: '\x1b[31m', // red
        };
        const reset = '\x1b[0m';
        const color = levelColors[entry.level];
        const contextStr = Object.entries(entry.context)
            .filter(([k]) => k !== 'service')
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(' ');
        console.log(`${entry.timestamp} ${color}${entry.level.toUpperCase().padEnd(5)}${reset} [${entry.context.service}] ${entry.message} ${contextStr}`);
        if (entry.error?.stack) {
            console.log(entry.error.stack);
        }
    }
}
exports.Logger = Logger;
/**
 * Create a logger for a service.
 */
function createLogger(service, level = 'info') {
    return new Logger({
        service,
        level,
        pretty: process.env.NODE_ENV !== 'production',
    });
}
