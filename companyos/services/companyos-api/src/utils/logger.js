"use strict";
/**
 * CompanyOS Logger Utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(name) {
    const formatContext = (context) => {
        if (!context || Object.keys(context).length === 0)
            return '';
        return ' ' + JSON.stringify(context);
    };
    return {
        info(message, context) {
            console.log(`[${new Date().toISOString()}] [INFO] [${name}] ${message}${formatContext(context)}`);
        },
        warn(message, context) {
            console.warn(`[${new Date().toISOString()}] [WARN] [${name}] ${message}${formatContext(context)}`);
        },
        error(message, context) {
            console.error(`[${new Date().toISOString()}] [ERROR] [${name}] ${message}${formatContext(context)}`);
        },
        debug(message, context) {
            if (process.env.DEBUG || process.env.LOG_LEVEL === 'debug') {
                console.debug(`[${new Date().toISOString()}] [DEBUG] [${name}] ${message}${formatContext(context)}`);
            }
        },
    };
}
