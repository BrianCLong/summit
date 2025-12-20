/**
 * Digital Signal Processor
 * TRAINING/SIMULATION ONLY
 */

export interface ProcessingResult {
  id: string;
  inputSamples: number;
  outputSamples: number;
  processingTime: number;
  operations: string[];
  metrics: {
    peakPower: number;
    averagePower: number;
    snr: number;
    bandwidth: number;
  };
}

export interface FilterConfig {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'bandstop';
  cutoffLow?: number;
  cutoffHigh?: number;
  order: number;
}

export class SignalProcessor {
  private sampleRate: number;

  constructor(sampleRate: number = 1e6) {
    this.sampleRate = sampleRate;
  }

  /**
   * Apply FIR filter to signal
   */
  applyFilter(
    signal: Float32Array,
    config: FilterConfig
  ): Float32Array {
    const coefficients = this.designFilter(config);
    return this.convolve(signal, coefficients);
  }

  /**
   * Design FIR filter coefficients using windowed sinc
   */
  private designFilter(config: FilterConfig): Float32Array {
    const N = config.order;
    const coeffs = new Float32Array(N);

    const fc = (config.cutoffLow || config.cutoffHigh || this.sampleRate / 4) / this.sampleRate;

    for (let i = 0; i < N; i++) {
      const n = i - (N - 1) / 2;
      if (n === 0) {
        coeffs[i] = 2 * fc;
      } else {
        coeffs[i] = Math.sin(2 * Math.PI * fc * n) / (Math.PI * n);
      }
      // Apply Hamming window
      coeffs[i] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1));
    }

    // Normalize
    const sum = coeffs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < N; i++) coeffs[i] /= sum;

    if (config.type === 'highpass') {
      // Spectral inversion for highpass
      for (let i = 0; i < N; i++) coeffs[i] *= -1;
      coeffs[Math.floor(N / 2)] += 1;
    }

    return coeffs;
  }

  /**
   * Convolve signal with filter coefficients
   */
  private convolve(signal: Float32Array, kernel: Float32Array): Float32Array {
    const output = new Float32Array(signal.length);
    const kLen = kernel.length;
    const half = Math.floor(kLen / 2);

    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      for (let j = 0; j < kLen; j++) {
        const idx = i - half + j;
        if (idx >= 0 && idx < signal.length) {
          sum += signal[idx] * kernel[j];
        }
      }
      output[i] = sum;
    }

    return output;
  }

  /**
   * Compute power spectral density using FFT
   */
  computePSD(signal: Float32Array, fftSize: number = 1024): Float32Array {
    const psd = new Float32Array(fftSize / 2);

    // Simple DFT for training (real FFT would use fft.js)
    for (let k = 0; k < fftSize / 2; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < Math.min(signal.length, fftSize); n++) {
        const angle = -2 * Math.PI * k * n / fftSize;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      psd[k] = 10 * Math.log10((real * real + imag * imag) / fftSize + 1e-10);
    }

    return psd;
  }

  /**
   * Decimate signal by factor
   */
  decimate(signal: Float32Array, factor: number): Float32Array {
    // Apply anti-aliasing filter first
    const filtered = this.applyFilter(signal, {
      type: 'lowpass',
      cutoffLow: this.sampleRate / (2 * factor),
      order: 64
    });

    const output = new Float32Array(Math.floor(filtered.length / factor));
    for (let i = 0; i < output.length; i++) {
      output[i] = filtered[i * factor];
    }

    return output;
  }

  /**
   * Interpolate signal by factor
   */
  interpolate(signal: Float32Array, factor: number): Float32Array {
    const output = new Float32Array(signal.length * factor);

    // Insert zeros
    for (let i = 0; i < signal.length; i++) {
      output[i * factor] = signal[i] * factor;
    }

    // Apply interpolation filter
    return this.applyFilter(output, {
      type: 'lowpass',
      cutoffLow: this.sampleRate / 2,
      order: 64
    });
  }

  /**
   * Mix signal to baseband (frequency shift)
   */
  mixToBaseband(
    i: Float32Array,
    q: Float32Array,
    centerFreq: number
  ): { i: Float32Array; q: Float32Array } {
    const outI = new Float32Array(i.length);
    const outQ = new Float32Array(q.length);

    for (let n = 0; n < i.length; n++) {
      const t = n / this.sampleRate;
      const phase = 2 * Math.PI * centerFreq * t;
      const cos = Math.cos(phase);
      const sin = Math.sin(phase);

      outI[n] = i[n] * cos + q[n] * sin;
      outQ[n] = q[n] * cos - i[n] * sin;
    }

    return { i: outI, q: outQ };
  }

  /**
   * Calculate signal metrics
   */
  calculateMetrics(signal: Float32Array): ProcessingResult['metrics'] {
    let sum = 0, sumSq = 0, peak = -Infinity;

    for (let i = 0; i < signal.length; i++) {
      const val = signal[i];
      sum += val;
      sumSq += val * val;
      if (Math.abs(val) > peak) peak = Math.abs(val);
    }

    const mean = sum / signal.length;
    const variance = sumSq / signal.length - mean * mean;
    const rms = Math.sqrt(sumSq / signal.length);

    // Estimate noise from quiet portions
    const sorted = Array.from(signal).sort((a, b) => Math.abs(a) - Math.abs(b));
    const noiseEstimate = sorted.slice(0, Math.floor(sorted.length * 0.2))
      .reduce((a, b) => a + b * b, 0) / Math.floor(sorted.length * 0.2);

    return {
      peakPower: 10 * Math.log10(peak * peak + 1e-10),
      averagePower: 10 * Math.log10(rms * rms + 1e-10),
      snr: 10 * Math.log10((sumSq / signal.length) / (noiseEstimate + 1e-10)),
      bandwidth: this.estimateBandwidth(signal)
    };
  }

  private estimateBandwidth(signal: Float32Array): number {
    const psd = this.computePSD(signal, 1024);
    const peak = Math.max(...psd);
    const threshold = peak - 3; // -3dB bandwidth

    let lowBin = 0, highBin = psd.length - 1;
    for (let i = 0; i < psd.length; i++) {
      if (psd[i] >= threshold) {
        lowBin = i;
        break;
      }
    }
    for (let i = psd.length - 1; i >= 0; i--) {
      if (psd[i] >= threshold) {
        highBin = i;
        break;
      }
    }

    return (highBin - lowBin) * this.sampleRate / 1024;
  }

  setSampleRate(rate: number): void {
    this.sampleRate = rate;
  }

  getSampleRate(): number {
    return this.sampleRate;
  }
}
