"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortDeep = sortDeep;
function sortDeep(v) {
    if (Array.isArray(v))
        return v
            .map(sortDeep)
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (v && typeof v === 'object') {
        return Object.fromEntries(Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, val]) => [k, sortDeep(val)]));
    }
    return v;
}
