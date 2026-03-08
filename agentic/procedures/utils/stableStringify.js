"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => [key, sortValue(child)]);
        return Object.fromEntries(entries);
    }
    return value;
}
function stableStringify(value) {
    return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}
