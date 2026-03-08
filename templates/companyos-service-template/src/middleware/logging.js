"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const request_context_js_1 = require("./request-context.js");
const config_js_1 = require("../config.js");
exports.logger = (0, pino_1.default)({
    level: config_js_1.config.logLevel,
    redact: ['req.headers.authorization'],
    base: { service: config_js_1.config.serviceName }
});
exports.loggingMiddleware = (0, pino_http_1.default)({
    logger: exports.logger,
    customProps: () => ({ requestId: (0, request_context_js_1.getRequestId)() })
});
