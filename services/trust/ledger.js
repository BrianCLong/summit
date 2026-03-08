"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = update;
exports.mean = mean;
function update(tr, ok) {
    return { a: tr.a + (ok ? 1 : 0), b: tr.b + (ok ? 0 : 1) };
}
function mean(tr) {
    return tr.a / (tr.a + tr.b);
}
