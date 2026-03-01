/**
 * Spectral Analyzer - Advanced spectrum analysis
 * TRAINING/SIMULATION ONLY
 */

export interface SpectralPeak {
  frequency: number;
  power: number;
  bandwidth: number;
  snr: number;
}

export interface WaterfallData {
  timestamp: Date;
  frequencies: number[];
  powers: number[];
}

export interface SpectrogramConfig {
  fftSize: number;
  overlap: number;
  window: 'hamming' | 'hanning' | 'blackman' | 'rectangular';
  sampleRate: number;
}

export class SpectralAnalyzer {
  private config: SpectrogramConfig;
  private waterfallHistory: WaterfallData[] = [];
  private maxHistoryLength: number = 100;

  constructor(config: Partial<SpectrogramConfig> = {}) {
    this.config = {
      fftSize: config.fftSize || 2048,
      overlap: config.overlap || 0.5,
      window: config.window || 'hamming',
      sampleRate: config.sampleRate || 1e6
    };
  }

  /**
   * Compute spectrogram from I/Q samples
   */
  computeSpectrogram(
    i: Float32Array,
    q: Float32Array
  ): { timeAxis: number[]; freqAxis: number[]; power: number[][] } {
    const hopSize = Math.floor(this.config.fftSize * (1 - this.config.overlap));
    const numFrames = Math.floor((i.length - this.config.fftSize) / hopSize) + 1;

    const window = this.getWindow(this.config.fftSize, this.config.window);
    const power: number[][] = [];
    const timeAxis: number[] = [];
    const freqAxis = this.getFrequencyAxis();

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      const frameI = new Float32Array(this.config.fftSize);
      const frameQ = new Float32Array(this.config.fftSize);

      // Apply window
      for (let n = 0; n < this.config.fftSize; n++) {
        frameI[n] = i[start + n] * window[n];
        frameQ[n] = q[start + n] * window[n];
      }

      // Compute FFT magnitude
      const spectrum = this.computeFFT(frameI, frameQ);
      power.push(spectrum);
      timeAxis.push(start / this.config.sampleRate);
    }

    return { timeAxis, freqAxis, power };
  }

  /**
   * Detect peaks in spectrum
   */
  detectPeaks(
    spectrum: Float32Array,
    threshold: number = -60
  ): SpectralPeak[] {
    const peaks: SpectralPeak[] = [];
    const freqResolution = this.config.sampleRate / this.config.fftSize;
    const noiseFloor = this.estimateNoiseFloor(spectrum);

    for (let i = 2; i < spectrum.length - 2; i++) {
      // Check if local maximum
      if (
        spectrum[i] > threshold &&
        spectrum[i] > spectrum[i - 1] &&
        spectrum[i] > spectrum[i + 1] &&
        spectrum[i] > spectrum[i - 2] &&
        spectrum[i] > spectrum[i + 2]
      ) {
        // Estimate bandwidth at -3dB
        const peakPower = spectrum[i];
        const threshold3dB = peakPower - 3;
        let lowBin = i, highBin = i;

        while (lowBin > 0 && spectrum[lowBin] > threshold3dB) lowBin--;
        while (highBin < spectrum.length - 1 && spectrum[highBin] > threshold3dB) highBin++;

        peaks.push({
          frequency: (i - this.config.fftSize / 2) * freqResolution,
          power: peakPower,
          bandwidth: (highBin - lowBin) * freqResolution,
          snr: peakPower - noiseFloor
        });
      }
    }

    return peaks.sort((a, b) => b.power - a.power);
  }

  /**
   * Add data to waterfall display
   */
  addWaterfallLine(spectrum: Float32Array): void {
    const data: WaterfallData = {
      timestamp: new Date(),
      frequencies: this.getFrequencyAxis(),
      powers: Array.from(spectrum)
    };

    this.waterfallHistory.push(data);

    if (this.waterfallHistory.length > this.maxHistoryLength) {
      this.waterfallHistory.shift();
    }
  }

  /**
   * Get waterfall display data
   */
  getWaterfall(): WaterfallData[] {
    return [...this.waterfallHistory];
  }

  /**
   * Compute cyclostationary features for signal detection
   */
  computeCyclicSpectrum(
    i: Float32Array,
    q: Float32Array,
    alpha: number
  ): Float32Array {
    const N = i.length;
    const output = new Float32Array(this.config.fftSize);

    // Simplified cyclic autocorrelation
    for (let tau = 0; tau < this.config.fftSize; tau++) {
      let sum = 0;
      for (let n = 0; n < N - tau; n++) {
        const x1 = i[n] + 1j * q[n];
        const x2 = i[n + tau] - 1j * q[n + tau];
        const phase = 2 * Math.PI * alpha * n / this.config.sampleRate;
        sum += (i[n] * i[n + tau] + q[n] * q[n + tau]) * Math.cos(phase);
      }
      output[tau] = sum / (N - tau);
    }

    return output;
  }

  /**
   * Estimate occupied bandwidth
   */
  estimateOccupiedBandwidth(
    spectrum: Float32Array,
    percentage: number = 0.99
  ): number {
    // Convert to linear power
    const linear = new Float32Array(spectrum.length);
    let totalPower = 0;

    for (let i = 0; i < spectrum.length; i++) {
      linear[i] = Math.pow(10, spectrum[i] / 10);
      totalPower += linear[i];
    }

    const targetPower = totalPower * percentage;
    const center = Math.floor(spectrum.length / 2);

    let cumPower = linear[center];
    let bandwidth = 1;

    while (cumPower < targetPower && bandwidth < spectrum.length) {
      const lowIdx = center - Math.floor(bandwidth / 2);
      const highIdx = center + Math.floor(bandwidth / 2);

      if (lowIdx >= 0) cumPower += linear[lowIdx];
      if (highIdx < spectrum.length) cumPower += linear[highIdx];

      bandwidth++;
    }

    return bandwidth * this.config.sampleRate / this.config.fftSize;
  }

  private computeFFT(i: Float32Array, q: Float32Array): number[] {
    const N = this.config.fftSize;
    const output: number[] = new Array(N);

    for (let k = 0; k < N; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += i[n] * Math.cos(angle) - q[n] * Math.sin(angle);
        imag += i[n] * Math.sin(angle) + q[n] * Math.cos(angle);
      }
      output[k] = 10 * Math.log10((real * real + imag * imag) / N + 1e-10);
    }

    // FFT shift
    const shifted = [...output.slice(N / 2), ...output.slice(0, N / 2)];
    return shifted;
  }

  private getWindow(size: number, type: string): Float32Array {
    const window = new Float32Array(size);

    for (let n = 0; n < size; n++) {
      switch (type) {
        case 'hamming':
          window[n] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (size - 1));
          break;
        case 'hanning':
          window[n] = 0.5 * (1 - Math.cos(2 * Math.PI * n / (size - 1)));
          break;
        case 'blackman':
          window[n] =
            0.42 -
            0.5 * Math.cos(2 * Math.PI * n / (size - 1)) +
            0.08 * Math.cos(4 * Math.PI * n / (size - 1));
          break;
        default:
          window[n] = 1;
      }
    }

    return window;
  }

  private getFrequencyAxis(): number[] {
    const axis: number[] = [];
    const freqResolution = this.config.sampleRate / this.config.fftSize;

    for (let i = 0; i < this.config.fftSize; i++) {
      axis.push((i - this.config.fftSize / 2) * freqResolution);
    }

    return axis;
  }

  private estimateNoiseFloor(spectrum: Float32Array): number {
    const sorted = Array.from(spectrum).sort((a, b) => a - b);
    // Use 20th percentile as noise floor estimate
    return sorted[Math.floor(sorted.length * 0.2)];
  }

  setConfig(config: Partial<SpectrogramConfig>): void {
    Object.assign(this.config, config);
  }

  clearHistory(): void {
    this.waterfallHistory = [];
  }
}
