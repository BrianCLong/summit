"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectIfStale = rejectIfStale;
function rejectIfStale(tsHeader, maxSkewSec = 300) {
    const ts = Number(tsHeader ?? 0);
    if (!Number.isFinite(ts))
        return true;
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - ts) > maxSkewSec;
}
