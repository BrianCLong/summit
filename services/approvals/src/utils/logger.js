"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
const pino_1 = __importDefault(require("pino"));
const config_js_1 = require("../config.js");
const isDevelopment = config_js_1.config.nodeEnv !== 'production';
exports.logger = (0, pino_1.default)({
    name: 'approvals-service',
    level: config_js_1.config.logLevel,
    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    formatters: {
        level: (label) => ({ level: label }),
    },
    base: {
        service: 'approvals',
        version: process.env.npm_package_version || '1.0.0',
    },
});
function createChildLogger(bindings) {
    return exports.logger.child(bindings);
}
