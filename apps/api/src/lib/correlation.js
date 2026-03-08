"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCorrelationId = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const resolveCorrelationId = (req, res) => {
    const incoming = req.headers['x-correlation-id']?.trim() || '';
    const correlationId = incoming.length > 0 ? incoming : node_crypto_1.default.randomUUID();
    if (res) {
        res.setHeader('x-correlation-id', correlationId);
    }
    return correlationId;
};
exports.resolveCorrelationId = resolveCorrelationId;
