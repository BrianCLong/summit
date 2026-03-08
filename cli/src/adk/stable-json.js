"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
function stableStringify(value) {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    if (typeof value === 'object') {
        const record = value;
        const keys = Object.keys(record).sort();
        const entries = keys
            .filter((key) => typeof record[key] !== 'undefined')
            .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}
