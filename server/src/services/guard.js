"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuspicious = isSuspicious;
const INJECTION_SIGNS = [
    /ignore previous/i,
    /disregard instructions/i,
    /exfiltrate/i,
    /system prompt/i,
    /retrieve secrets?/i,
    /api key/i,
];
function isSuspicious(input) {
    const s = input.slice(0, 4000);
    return INJECTION_SIGNS.some((rx) => rx.test(s));
}
