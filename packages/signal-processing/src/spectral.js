"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpectralAnalyzer = void 0;
const DEFAULT_BANDS = [
    { name: 'low', fromHz: 0, toHz: 300 },
    { name: 'mid', fromHz: 300, toHz: 3000 },
    { name: 'high', fromHz: 3000, toHz: 20000 },
];
class SpectralAnalyzer {
    fftAnalyzer;
    constructor(fftAnalyzer) {
        this.fftAnalyzer = fftAnalyzer;
    }
    analyze(samples, sampleRate, bands = DEFAULT_BANDS) {
        if (sampleRate <= 0) {
            throw new Error('Sample rate must be positive');
        }
        if (bands.length === 0) {
            throw new Error('At least one band definition is required');
        }
        const frame = this.fftAnalyzer.analyze(samples, sampleRate);
        const { frequencies, magnitudes, powerSpectralDensity } = frame;
        const sumMagnitude = magnitudes.reduce((acc, value) => acc + value, 0) + Number.EPSILON;
        const centroidNumerator = frequencies.reduce((acc, f, idx) => acc + f * magnitudes[idx], 0);
        const spectralCentroid = centroidNumerator / sumMagnitude;
        const bandwidthNumerator = frequencies.reduce((acc, f, idx) => acc + (f - spectralCentroid) ** 2 * magnitudes[idx], 0);
        const spectralBandwidth = Math.sqrt(bandwidthNumerator / sumMagnitude);
        const geometricMean = Math.exp(magnitudes.reduce((acc, mag) => acc + Math.log(mag + Number.EPSILON), 0) / magnitudes.length);
        const arithmeticMean = sumMagnitude / magnitudes.length;
        const spectralFlatness = geometricMean / arithmeticMean;
        const dominantIdx = magnitudes.reduce((maxIdx, mag, idx) => (mag > magnitudes[maxIdx] ? idx : maxIdx), 0);
        const dominantFrequency = frequencies[dominantIdx];
        const bandPower = {};
        bands.forEach((band) => {
            let power = 0;
            for (let i = 0; i < frequencies.length; i += 1) {
                if (frequencies[i] >= band.fromHz && frequencies[i] < band.toHz) {
                    power += powerSpectralDensity[i];
                }
            }
            bandPower[band.name] = power;
        });
        return { dominantFrequency, spectralCentroid, spectralBandwidth, spectralFlatness, bandPower };
    }
    frame(samples, sampleRate) {
        return this.fftAnalyzer.analyze(samples, sampleRate);
    }
}
exports.SpectralAnalyzer = SpectralAnalyzer;
