"use strict";
// @ts-nocheck
/**
 * IntelGraph Logger Utility
 * Simple logger for the ingest service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (message) => {
        const msg = typeof message === 'string'
            ? { message, timestamp: new Date().toISOString() }
            : { ...message, timestamp: new Date().toISOString() };
        console.info(JSON.stringify(msg));
    },
    error: (message) => {
        const msg = typeof message === 'string'
            ? { message, timestamp: new Date().toISOString() }
            : { ...message, timestamp: new Date().toISOString() };
        console.error(JSON.stringify(msg));
    },
    warn: (message) => {
        const msg = typeof message === 'string'
            ? { message, timestamp: new Date().toISOString() }
            : { ...message, timestamp: new Date().toISOString() };
        console.warn(JSON.stringify(msg));
    },
    debug: (message) => {
        if (process.env.DEBUG) {
            const msg = typeof message === 'string'
                ? { message, timestamp: new Date().toISOString() }
                : { ...message, timestamp: new Date().toISOString() };
            console.debug(JSON.stringify(msg));
        }
    },
};
