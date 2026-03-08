"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laplace = laplace;
exports.dpCount = dpCount;
function laplace(scale) {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}
function dpCount(raw, eps, sensitivity = 1) {
    const b = sensitivity / eps;
    return Math.round(raw + laplace(b));
}
