"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ips = ips;
function ips(samples) {
    const w = samples.map((s) => (s.p_new / (s.p_beh + 1e-9)) * s.reward);
    return w.reduce((a, b) => a + b, 0) / samples.length;
}
