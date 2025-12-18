import { FftAnalyzer } from './fft.js';
import { Spectrogram, SpectrogramSlice, WindowFunction, NumericArray } from './types.js';
import { createWindow, normalizeFrame } from './window.js';

export interface SpectrogramOptions {
  hopSize: number;
  window?: WindowFunction;
}

export function computeSpectrogram(
  samples: NumericArray,
  sampleRate: number,
  fftSize: number,
  { hopSize, window }: SpectrogramOptions,
): Spectrogram {
  if (hopSize <= 0) {
    throw new Error('hopSize must be positive');
  }
  if (sampleRate <= 0) {
    throw new Error('sampleRate must be positive');
  }
  if (fftSize <= 0 || (fftSize & (fftSize - 1)) !== 0) {
    throw new Error('fftSize must be a power of two');
  }
  const windowFn = window ?? createWindow('hann', fftSize);
  const analyzer = new FftAnalyzer(fftSize, { window: windowFn });
  const slices: SpectrogramSlice[] = [];
  let frequencyBins: Float64Array | null = null;

  for (let offset = 0; offset + fftSize <= samples.length; offset += hopSize) {
    const frame = normalizeFrame(samples.subarray(offset, offset + fftSize), fftSize);
    const { magnitudes, frequencies } = analyzer.analyze(frame, sampleRate);
    frequencyBins = frequencyBins ?? frequencies;
    slices.push({ timeMs: (offset / sampleRate) * 1000, magnitudes });
  }

  return {
    frequencyBins: frequencyBins ?? new Float64Array(fftSize / 2),
    slices,
  };
}
