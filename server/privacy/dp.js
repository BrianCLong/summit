"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.charge = charge;
function charge(ten, use, L) {
    const a = L[ten] || (L[ten] = { eps: 1.5, spent: 0 });
    if (a.spent + use > a.eps)
        throw new Error('DP budget exceeded');
    a.spent += use;
}
