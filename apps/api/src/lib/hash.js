"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashExecutionInput = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const canonicalize = (value) => {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalize).join(',')}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
        .map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`)
        .join(',')}}`;
};
const hashExecutionInput = (payload) => {
    const normalized = canonicalize({
        action: payload.action ?? 'default',
        input: payload.input,
    });
    return node_crypto_1.default.createHash('sha256').update(normalized).digest('hex');
};
exports.hashExecutionInput = hashExecutionInput;
