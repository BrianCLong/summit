"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
exports.sha256 = sha256;
exports.hmacSha256 = hmacSha256;
const node_crypto_1 = __importDefault(require("node:crypto"));
function canonicalize(value) {
    return JSON.stringify(sortJson(value));
}
function sortJson(value) {
    if (Array.isArray(value)) {
        return value.map(sortJson);
    }
    if (value && typeof value === 'object') {
        const sortedEntries = Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, sortJson(v)]);
        return Object.fromEntries(sortedEntries);
    }
    return value;
}
function sha256(input) {
    return node_crypto_1.default.createHash('sha256').update(input).digest('hex');
}
function hmacSha256(secret, input) {
    return node_crypto_1.default.createHmac('sha256', secret).update(input).digest('hex');
}
