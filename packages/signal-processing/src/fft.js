"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FftAnalyzer = void 0;
const fft_js_1 = __importDefault(require("fft.js"));
const window_js_1 = require("./window.js");
class FftAnalyzer {
    size;
    fft;
    window;
    constructor(size, options = {}) {
        this.size = size;
        if (size <= 0 || (size & (size - 1)) !== 0) {
            throw new Error('FFT size must be a power of two greater than zero.');
        }
        this.fft = new fft_js_1.default(size);
        this.window = options.window ?? (0, window_js_1.createWindow)('hann', size);
    }
    analyze(samples, sampleRate) {
        const normalized = (0, window_js_1.normalizeFrame)(samples, this.size);
        const windowed = (0, window_js_1.applyWindow)(normalized, this.window);
        const spectrum = this.fft.createComplexArray();
        this.fft.realTransform(spectrum, windowed);
        this.fft.completeSpectrum(spectrum);
        const binCount = this.size / 2;
        const magnitudes = new Float64Array(binCount);
        const phases = new Float64Array(binCount);
        const powerSpectralDensity = new Float64Array(binCount);
        const frequencies = new Float64Array(binCount);
        const normFactor = 1 / binCount;
        for (let i = 0; i < binCount; i += 1) {
            const re = spectrum[2 * i];
            const im = spectrum[2 * i + 1];
            const magnitude = Math.sqrt(re * re + im * im) * normFactor;
            magnitudes[i] = magnitude;
            phases[i] = Math.atan2(im, re);
            powerSpectralDensity[i] = magnitude * magnitude;
            frequencies[i] = (i * sampleRate) / this.size;
        }
        return { frequencies, magnitudes, phases, powerSpectralDensity };
    }
}
exports.FftAnalyzer = FftAnalyzer;
