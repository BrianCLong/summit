"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.psi = psi;
function psi(p, q) {
    return (0.5 *
        (p.reduce((s, pi, i) => s + pi * Math.log(pi / q[i]), 0) +
            q.reduce((s, qi, i) => s + qi * Math.log(qi / p[i]), 0)));
}
