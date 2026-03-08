"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.maybeLog = maybeLog;
const structuredLogger_js_1 = require("./src/logging/structuredLogger.js");
exports.logger = structuredLogger_js_1.appLogger;
const rate = Number(process.env.LOG_SAMPLE_RATE || '1.0');
function maybeLog(level, obj) {
    if (level === 'error' || Math.random() < rate)
        exports.logger[level](obj);
}
