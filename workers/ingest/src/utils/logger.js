"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => ({ level: label }),
    },
    serializers: {
        error: pino_1.default.stdSerializers.error,
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
    },
    redact: {
        paths: [
            'password',
            'token',
            'apiKey',
            'secret',
            'authorization',
            '*.password',
            '*.token',
            '*.apiKey',
            '*.secret',
            '*.authorization',
        ],
        censor: '[REDACTED]',
    },
});
exports.default = exports.logger;
