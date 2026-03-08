"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
// factmarkets/lib/stable_json.ts
function stableStringify(x) {
    const norm = (v) => Array.isArray(v) ? v.map(norm) :
        v && typeof v === "object"
            ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])]))
            : v;
    return `${JSON.stringify(norm(x), null, 2)}\n`;
}
