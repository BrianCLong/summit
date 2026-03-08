"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSpectrogram = computeSpectrogram;
// @ts-nocheck
const fft_js_1 = require("./fft.js");
const window_js_1 = require("./window.js");
function computeSpectrogram(samples, sampleRate, fftSize, { hopSize, window }) {
    if (hopSize <= 0) {
        throw new Error('hopSize must be positive');
    }
    if (sampleRate <= 0) {
        throw new Error('sampleRate must be positive');
    }
    if (fftSize <= 0 || (fftSize & (fftSize - 1)) !== 0) {
        throw new Error('fftSize must be a power of two');
    }
    const windowFn = window ?? (0, window_js_1.createWindow)('hann', fftSize);
    const analyzer = new fft_js_1.FftAnalyzer(fftSize, { window: windowFn });
    const slices = [];
    let frequencyBins = null;
    for (let offset = 0; offset + fftSize <= samples.length; offset += hopSize) {
        const frame = (0, window_js_1.normalizeFrame)(samples.subarray(offset, offset + fftSize), fftSize);
        const { magnitudes, frequencies } = analyzer.analyze(frame, sampleRate);
        frequencyBins = frequencyBins ?? frequencies;
        slices.push({ timeMs: (offset / sampleRate) * 1000, magnitudes });
    }
    return {
        frequencyBins: frequencyBins ?? new Float64Array(fftSize / 2),
        slices,
    };
}
