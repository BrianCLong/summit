"use strict";
/**
 * Simple logger utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    context;
    level;
    constructor(context, level = 'info') {
        this.context = context;
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentIndex = levels.indexOf(this.level);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase().padEnd(5);
        return `[${timestamp}] ${levelUpper} [${this.context}] ${message}`;
    }
    getColor(level) {
        switch (level) {
            case 'debug':
                return '\x1b[36m'; // Cyan
            case 'info':
                return '\x1b[32m'; // Green
            case 'warn':
                return '\x1b[33m'; // Yellow
            case 'error':
                return '\x1b[31m'; // Red
            default:
                return '\x1b[0m'; // Reset
        }
    }
    debug(message) {
        if (this.shouldLog('debug')) {
            const color = this.getColor('debug');
            const reset = '\x1b[0m';
            console.log(`${color}${this.formatMessage('debug', message)}${reset}`);
        }
    }
    info(message) {
        if (this.shouldLog('info')) {
            const color = this.getColor('info');
            const reset = '\x1b[0m';
            console.log(`${color}${this.formatMessage('info', message)}${reset}`);
        }
    }
    warn(message) {
        if (this.shouldLog('warn')) {
            const color = this.getColor('warn');
            const reset = '\x1b[0m';
            console.warn(`${color}${this.formatMessage('warn', message)}${reset}`);
        }
    }
    error(message, error) {
        if (this.shouldLog('error')) {
            const color = this.getColor('error');
            const reset = '\x1b[0m';
            console.error(`${color}${this.formatMessage('error', message)}${reset}`);
            if (error) {
                console.error(error);
            }
        }
    }
    setLevel(level) {
        this.level = level;
    }
}
exports.Logger = Logger;
