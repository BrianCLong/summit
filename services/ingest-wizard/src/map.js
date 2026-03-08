"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRow = mapRow;
function mapRow(row, m) {
    const out = {};
    for (const r of m) {
        out[r.to] = row[r.from];
    }
    return out;
}
