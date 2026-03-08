"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactLogs = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({
    redact: {
        paths: ['req.headers.authorization', 'variables.*', 'data.*'],
        remove: true,
    },
});
const redactLogs = () => ({
    async requestDidStart({ request, context }) {
        const logData = { op: request.operationName };
        if (context.traceId) {
            logData.trace_id = context.traceId;
        }
        if (context.spanId) {
            logData.span_id = context.spanId;
        }
        logger.info(logData, 'op start');
    },
    async willSendResponse({ response, context }) {
        const logData = { status: response?.http?.status };
        if (context.traceId) {
            logData.trace_id = context.traceId;
        }
        if (context.spanId) {
            logData.span_id = context.spanId;
        }
        logger.info(logData, 'op done');
    },
});
exports.redactLogs = redactLogs;
