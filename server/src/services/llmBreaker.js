"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapStream = wrapStream;
const opossum_1 = __importDefault(require("opossum"));
function wrapStream(fn) {
    const breaker = new opossum_1.default(async (...args) => {
        const results = [];
        for await (const t of fn(...args)) {
            results.push(t);
        }
        return results;
    }, {
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
        rollingCountTimeout: 10000,
    });
    return async function* (...args) {
        const results = (await breaker.fire(...args));
        for (const t of results)
            yield t;
    };
}
