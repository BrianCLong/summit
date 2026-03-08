"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTabularData = normalizeTabularData;
function normalizeTabularData(data) {
    if (Array.isArray(data)) {
        return data.map((row) => (typeof row === 'object' ? row : { value: row }));
    }
    if (typeof data === 'object')
        return [(data || {})];
    return [{ value: data }];
}
