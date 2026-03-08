"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
/**
 * Create a simple logger
 */
function createLogger(name) {
    return {
        debug: (msg, meta) => console.debug(`[${name}] ${msg}`, meta || ''),
        info: (msg, meta) => console.info(`[${name}] ${msg}`, meta || ''),
        warn: (msg, meta) => console.warn(`[${name}] ${msg}`, meta || ''),
        error: (msg, meta) => console.error(`[${name}] ${msg}`, meta || ''),
    };
}
