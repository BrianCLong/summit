"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSecrets = redactSecrets;
const TOKEN_PATTERNS = [
    /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/g,
    /nvapi-[A-Za-z0-9]+/g
];
function redactSecrets(input) {
    let out = input;
    for (const re of TOKEN_PATTERNS) {
        out = out.replace(re, "[REDACTED]");
    }
    return out;
}
