"use strict";
/**
 * Logger utility for Collective Intelligence Weaving
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
class ConsoleLogger {
    context;
    level;
    constructor(context, level = 'info') {
        this.context = context;
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaStr}`;
    }
    debug(message, meta) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, meta));
        }
    }
    info(message, meta) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, meta));
        }
    }
    warn(message, meta) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }
    error(message, meta) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, meta));
        }
    }
}
function createLogger(context, level) {
    const logLevel = level || process.env.LOG_LEVEL || 'info';
    return new ConsoleLogger(context, logLevel);
}
