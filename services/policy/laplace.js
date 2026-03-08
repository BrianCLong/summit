"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laplace = laplace;
function laplace(mech) {
    const { value, sensitivity, epsilon } = mech;
    const b = sensitivity / epsilon;
    const u = Math.random() - 0.5;
    return value - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}
