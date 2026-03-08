"use strict";
/**
 * Logger Utility
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class Logger {
    level;
    constructor() {
        this.level = process.env.LOG_LEVEL || 'info';
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
    formatLog(level, data) {
        const entry = {
            level,
            timestamp: new Date().toISOString(),
            ...data,
            message: String(data.message || ''),
        };
        return JSON.stringify(entry);
    }
    debug(data) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatLog('debug', data));
        }
    }
    info(data) {
        if (this.shouldLog('info')) {
            console.info(this.formatLog('info', data));
        }
    }
    warn(data) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatLog('warn', data));
        }
    }
    error(data) {
        if (this.shouldLog('error')) {
            console.error(this.formatLog('error', data));
        }
    }
}
exports.logger = new Logger();
exports.default = exports.logger;
