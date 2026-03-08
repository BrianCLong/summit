"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTraceId = createTraceId;
exports.emitApiCallEvent = emitApiCallEvent;
const fs_1 = require("fs");
const crypto_1 = __importDefault(require("crypto"));
const eventLogPath = process.env.API_EVENT_LOG || 'api-events.log';
function createTraceId() {
    return crypto_1.default.randomUUID();
}
function emitApiCallEvent(event) {
    const traceId = event.traceId || createTraceId();
    const record = {
        ...event,
        traceId,
        ts: new Date().toISOString(),
    };
    (0, fs_1.appendFileSync)(eventLogPath, JSON.stringify(record) + '\n');
    return traceId;
}
