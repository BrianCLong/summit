"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocoStep = ocoStep;
function ocoStep(price, grad, eta = 0.05, pmin = 0, pmax = 5) {
    // grad>0 → raise price (demand>capacity); grad<0 → lower price
    const p = price - eta * grad;
    return Math.max(pmin, Math.min(pmax, p));
}
