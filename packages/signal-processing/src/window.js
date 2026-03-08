"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWindow = createWindow;
exports.applyWindow = applyWindow;
exports.normalizeFrame = normalizeFrame;
function generateWindow(kind, size) {
    if (size <= 0) {
        throw new Error('Window size must be positive');
    }
    const w = new Float64Array(size);
    switch (kind) {
        case 'rectangular':
            w.fill(1);
            break;
        case 'hann':
            for (let n = 0; n < size; n += 1) {
                w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (size - 1)));
            }
            break;
        case 'hamming':
            for (let n = 0; n < size; n += 1) {
                w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (size - 1));
            }
            break;
        default:
            throw new Error(`Unsupported window kind: ${kind}`);
    }
    return w;
}
function createWindow(kind, size) {
    return { kind, values: generateWindow(kind, size) };
}
function applyWindow(data, window) {
    const src = data instanceof Float64Array ? data : Float64Array.from(data);
    const size = window.values.length;
    const out = new Float64Array(size);
    for (let i = 0; i < size; i += 1) {
        out[i] = (src[i] ?? 0) * window.values[i];
    }
    return out;
}
function normalizeFrame(data, size) {
    const src = data instanceof Float64Array ? data : Float64Array.from(data);
    if (src.length === size) {
        return src;
    }
    const normalized = new Float64Array(size);
    normalized.set(src.slice(0, size));
    return normalized;
}
