"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.winstonBridge = void 0;
const winston_1 = __importDefault(require("winston"));
const structuredLogger_js_1 = require("./structuredLogger.js");
const stream = {
    write: (message) => {
        try {
            const parsed = JSON.parse(message);
            structuredLogger_js_1.appLogger.info(parsed);
        }
        catch {
            structuredLogger_js_1.appLogger.info({ message });
        }
    },
};
exports.winstonBridge = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.json(),
    defaultMeta: { service: process.env.SERVICE_NAME || 'summit-api' },
    transports: [new winston_1.default.transports.Stream({ stream })],
});
