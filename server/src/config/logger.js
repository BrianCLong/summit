"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pino_1 = require("pino");
var logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: function (label) {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    browser: {
        asObject: true,
    },
    // Remove pino-pretty transport for production readiness
    // In production, logs should be structured JSON for log aggregation
});
exports.default = logger;
