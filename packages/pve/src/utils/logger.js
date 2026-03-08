"use strict";
/**
 * PVE Logger Utility
 *
 * Structured logging for the Policy Validation Engine.
 *
 * @module pve/utils/logger
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
function createLogger(config = { level: 'info' }) {
    const { level, prefix = '[PVE]', silent = false, format = 'text' } = config;
    const minLevel = LOG_LEVELS[level];
    function log(logLevel, message, context) {
        if (silent || LOG_LEVELS[logLevel] < minLevel) {
            return;
        }
        const entry = {
            level: logLevel,
            message,
            timestamp: new Date().toISOString(),
            context,
        };
        const output = format === 'json'
            ? JSON.stringify(entry)
            : formatTextLog(entry, prefix);
        switch (logLevel) {
            case 'debug':
            case 'info':
                console.log(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            case 'error':
                console.error(output);
                break;
        }
    }
    return {
        debug: (message, context) => log('debug', message, context),
        info: (message, context) => log('info', message, context),
        warn: (message, context) => log('warn', message, context),
        error: (message, context) => log('error', message, context),
    };
}
function formatTextLog(entry, prefix) {
    const levelColors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m', // green
        warn: '\x1b[33m', // yellow
        error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];
    const levelStr = entry.level.toUpperCase().padEnd(5);
    let output = `${color}${prefix} ${levelStr}${reset} ${entry.message}`;
    if (entry.context && Object.keys(entry.context).length > 0) {
        output += ` ${JSON.stringify(entry.context)}`;
    }
    return output;
}
// Default logger instance
exports.logger = createLogger();
