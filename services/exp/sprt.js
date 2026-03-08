"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sprt = sprt;
function sprt(successA, totalA, successB, totalB, p0 = 0.99, p1 = 0.995, alpha = 0.05, beta = 0.1) {
    const A = Math.log((1 - beta) / alpha), B = Math.log(beta / (1 - alpha));
    const ll = (s, t, p) => s * Math.log(p) + (t - s) * Math.log(1 - p);
    const L = ll(successA, totalA, p1) -
        ll(successA, totalA, p0) +
        (ll(successB, totalB, 1 - p1) - ll(successB, totalB, 1 - p0));
    return L > A ? 'accept' : L < B ? 'reject' : 'continue';
}
