"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
function parse(src) {
    return src
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
        const m = /^([a-z]+)\s+role:([^\s]+)\s+([a-z]+)\s+where\s+(.+)$/.exec(line);
        if (!m) {
            throw new Error(`syntax_error:${line}`);
        }
        return { action: m[1], role: m[2], resource: m[3], condition: m[4] };
    });
}
