"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = normalize;
function normalize(q) {
    return q.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFKC');
}
