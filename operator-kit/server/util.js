"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceId = traceId;
exports.p95 = p95;
const crypto_1 = __importDefault(require("crypto"));
function traceId() {
    return crypto_1.default.randomBytes(8).toString('hex');
}
function p95(latencies) {
    if (!latencies.length)
        return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const idx = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}
