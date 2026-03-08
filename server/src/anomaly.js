"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ewma = ewma;
exports.robustZ = robustZ;
exports.median = median;
exports.detectAnomalySeries = detectAnomalySeries;
function ewma(prev, x, alpha = 0.2) {
    return alpha * x + (1 - alpha) * prev;
}
function robustZ(x, mu, mad) {
    return mad ? Math.abs(x - mu) / (1.4826 * mad) : 0;
}
function median(a) {
    const s = [...a].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}
function detectAnomalySeries(series, latest) {
    const mu = series.reduce((a, b) => a + b, 0) / Math.max(1, series.length);
    const mad = median(series.map((v) => Math.abs(v - mu)));
    const z = robustZ(latest, mu, mad);
    return { anomaly: z >= 4, z };
}
