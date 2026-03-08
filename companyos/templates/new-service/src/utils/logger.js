"use strict";
/**
 * Structured Logger
 * Provides consistent logging with tenant context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const config_js_1 = require("../config.js");
class Logger {
    context = {};
    serviceName;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    clearContext() {
        this.context = {};
    }
    log(level, message, data) {
        const levelPriority = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };
        const configLevel = config_js_1.config.logLevel;
        if (levelPriority[level] < levelPriority[configLevel]) {
            return;
        }
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            message,
            ...this.context,
            ...data,
        };
        const output = JSON.stringify(logEntry);
        switch (level) {
            case 'debug':
                console.debug(output);
                break;
            case 'info':
                console.info(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            case 'error':
                console.error(output);
                break;
        }
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    error(message, data) {
        this.log('error', message, data);
    }
}
exports.logger = new Logger(config_js_1.config.serviceName);
