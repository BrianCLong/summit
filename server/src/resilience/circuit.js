"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = wrap;
const opossum_1 = __importDefault(require("opossum"));
function wrap(fn, name) {
    const breaker = new opossum_1.default(fn, {
        timeout: 2000,
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
        rollingCountBuckets: 10,
        rollingCountTimeout: 10000
    });
    breaker.fallback((...args) => {
        return { error: 'degraded', data: null, fallback: true };
    });
    breaker.on('open', () => console.warn(`[cb] open ${name}`));
    return (...args) => breaker.fire(...args);
}
