"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.breaker = breaker;
const opossum_1 = __importDefault(require("opossum"));
function breaker(fn, name, opts = {}) {
    const br = new opossum_1.default(fn, {
        timeout: 3000, // fail fast
        errorThresholdPercentage: 50, // trip after 50% errors in window
        resetTimeout: 10_000, // half-open after 10s
        rollingCountTimeout: 10_000,
        rollingCountBuckets: 10,
        ...opts,
    });
    br.on('open', () => console.warn(`[BREAKER:${name}] OPEN - circuit tripped`));
    br.on('halfOpen', () => console.warn(`[BREAKER:${name}] HALF-OPEN - testing recovery`));
    br.on('close', () => console.log(`[BREAKER:${name}] CLOSED - circuit healthy`));
    // Fallback strategy
    br.fallback(() => {
        throw new Error(`Service unavailable: ${name} circuit open`);
    });
    return br;
}
