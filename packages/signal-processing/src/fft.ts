import FFT from 'fft.js';
import { applyWindow, createWindow, normalizeFrame } from './window.js';
import { FrequencyDomainFrame, NumericArray, WindowFunction } from './types.js';

export interface FftOptions {
  window?: WindowFunction;
}

export class FftAnalyzer {
  private readonly fft: FFT;

  private readonly window: WindowFunction;

  constructor(private readonly size: number, options: FftOptions = {}) {
    if (size <= 0 || (size & (size - 1)) !== 0) {
      throw new Error('FFT size must be a power of two greater than zero.');
    }
    this.fft = new FFT(size);
    this.window = options.window ?? createWindow('hann', size);
  }

  analyze(samples: NumericArray, sampleRate: number): FrequencyDomainFrame {
    const normalized = normalizeFrame(samples, this.size);
    const windowed = applyWindow(normalized, this.window);
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
