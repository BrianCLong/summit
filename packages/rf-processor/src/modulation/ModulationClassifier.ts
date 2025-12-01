/**
 * Automatic Modulation Classification
 * TRAINING/SIMULATION ONLY
 */

import { ModulationType } from '@summit/sigint-collector';

export interface ClassificationResult {
  modulation: ModulationType;
  confidence: number;
  alternatives: Array<{ modulation: ModulationType; confidence: number }>;
  features: ModulationFeatures;
}

export interface ModulationFeatures {
  // Time domain
  meanAmplitude: number;
  stdAmplitude: number;
  kurtosis: number;
  skewness: number;

  // Frequency domain
  spectralFlatness: number;
  spectralCentroid: number;
  spectralBandwidth: number;
  peakToAverage: number;

  // Phase features
  phaseStd: number;
  symbolRate: number;
}

export class ModulationClassifier {
  private featureThresholds: Map<ModulationType, Partial<ModulationFeatures>>;

  constructor() {
    this.featureThresholds = new Map();
    this.initializeThresholds();
  }

  private initializeThresholds(): void {
    // Simplified thresholds for training purposes
    this.featureThresholds.set('AM', {
      kurtosis: 3.0,
      spectralFlatness: 0.3
    });
    this.featureThresholds.set('FM', {
      kurtosis: 1.5,
      spectralBandwidth: 75000
    });
    this.featureThresholds.set('BPSK', {
      phaseStd: 0.8,
      kurtosis: 2.0
    });
    this.featureThresholds.set('QPSK', {
      phaseStd: 0.5,
      kurtosis: 1.8
    });
    this.featureThresholds.set('OFDM', {
      spectralFlatness: 0.8,
      peakToAverage: 10
    });
  }

  /**
   * Classify modulation type from I/Q samples
   */
  classify(i: Float32Array, q: Float32Array): ClassificationResult {
    const features = this.extractFeatures(i, q);
    const scores = this.computeScores(features);

    // Sort by score
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);

    const best = sorted[0];
    const total = sorted.reduce((sum, [_, score]) => sum + score, 0);

    return {
      modulation: best[0],
      confidence: best[1] / total,
      alternatives: sorted.slice(1, 4).map(([mod, score]) => ({
        modulation: mod,
        confidence: score / total
      })),
      features
    };
  }

  /**
   * Extract features for classification
   */
  extractFeatures(i: Float32Array, q: Float32Array): ModulationFeatures {
    const amplitude = new Float32Array(i.length);
    const phase = new Float32Array(i.length);

    for (let n = 0; n < i.length; n++) {
      amplitude[n] = Math.sqrt(i[n] * i[n] + q[n] * q[n]);
      phase[n] = Math.atan2(q[n], i[n]);
    }

    const ampStats = this.computeStats(amplitude);
    const phaseStats = this.computeStats(phase);
    const spectralFeatures = this.computeSpectralFeatures(i, q);

    return {
      meanAmplitude: ampStats.mean,
      stdAmplitude: ampStats.std,
      kurtosis: ampStats.kurtosis,
      skewness: ampStats.skewness,
      spectralFlatness: spectralFeatures.flatness,
      spectralCentroid: spectralFeatures.centroid,
      spectralBandwidth: spectralFeatures.bandwidth,
      peakToAverage: spectralFeatures.par,
      phaseStd: phaseStats.std,
      symbolRate: this.estimateSymbolRate(amplitude)
    };
  }

  private computeStats(data: Float32Array): {
    mean: number;
    std: number;
    kurtosis: number;
    skewness: number;
  } {
    const n = data.length;
    let sum = 0, sum2 = 0, sum3 = 0, sum4 = 0;

    for (let i = 0; i < n; i++) sum += data[i];
    const mean = sum / n;

    for (let i = 0; i < n; i++) {
      const d = data[i] - mean;
      sum2 += d * d;
      sum3 += d * d * d;
      sum4 += d * d * d * d;
    }

    const variance = sum2 / n;
    const std = Math.sqrt(variance);

    return {
      mean,
      std,
      kurtosis: variance > 0 ? (sum4 / n) / (variance * variance) : 0,
      skewness: variance > 0 ? (sum3 / n) / (std * std * std) : 0
    };
  }

  private computeSpectralFeatures(i: Float32Array, q: Float32Array): {
    flatness: number;
    centroid: number;
    bandwidth: number;
    par: number;
  } {
    const fftSize = Math.min(1024, i.length);
    const psd = new Float32Array(fftSize);

    // Compute magnitude spectrum
    for (let k = 0; k < fftSize; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < fftSize; n++) {
        const angle = -2 * Math.PI * k * n / fftSize;
        real += i[n] * Math.cos(angle) - q[n] * Math.sin(angle);
        imag += i[n] * Math.sin(angle) + q[n] * Math.cos(angle);
      }
      psd[k] = real * real + imag * imag;
    }

    // Spectral flatness (geometric mean / arithmetic mean)
    let logSum = 0, sum = 0, peak = 0;
    for (let k = 0; k < fftSize; k++) {
      const val = psd[k] + 1e-10;
      logSum += Math.log(val);
      sum += val;
      if (val > peak) peak = val;
    }
    const geoMean = Math.exp(logSum / fftSize);
    const ariMean = sum / fftSize;
    const flatness = geoMean / ariMean;

    // Spectral centroid
    let weightedSum = 0;
    for (let k = 0; k < fftSize; k++) {
      weightedSum += k * psd[k];
    }
    const centroid = sum > 0 ? weightedSum / sum : 0;

    // Spectral bandwidth
    let bwSum = 0;
    for (let k = 0; k < fftSize; k++) {
      bwSum += (k - centroid) * (k - centroid) * psd[k];
    }
    const bandwidth = sum > 0 ? Math.sqrt(bwSum / sum) : 0;

    // Peak to average ratio
    const par = ariMean > 0 ? peak / ariMean : 0;

    return { flatness, centroid, bandwidth, par };
  }

  private estimateSymbolRate(amplitude: Float32Array): number {
    // Simplified autocorrelation-based symbol rate estimation
    const maxLag = Math.min(500, amplitude.length / 2);
    let peakLag = 1;
    let peakCorr = 0;

    for (let lag = 10; lag < maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < amplitude.length - lag; i++) {
        corr += amplitude[i] * amplitude[i + lag];
      }
      if (corr > peakCorr) {
        peakCorr = corr;
        peakLag = lag;
      }
    }

    // Assume 1MHz sample rate for training
    return 1e6 / peakLag;
  }

  private computeScores(features: ModulationFeatures): Map<ModulationType, number> {
    const scores = new Map<ModulationType, number>();

    // Simple scoring based on feature matching
    const modTypes: ModulationType[] = [
      'AM', 'FM', 'BPSK', 'QPSK', 'QAM', 'OFDM', 'FSK', 'ASK'
    ];

    for (const mod of modTypes) {
      let score = 1.0;

      // Heuristic scoring for training demonstration
      switch (mod) {
        case 'AM':
          score *= features.kurtosis > 2.5 ? 2 : 0.5;
          score *= features.spectralFlatness < 0.5 ? 2 : 0.5;
          break;
        case 'FM':
          score *= features.stdAmplitude < 0.1 ? 2 : 0.5;
          score *= features.spectralBandwidth > 50000 ? 2 : 0.5;
          break;
        case 'BPSK':
          score *= Math.abs(features.phaseStd - 1.57) < 0.5 ? 2 : 0.5;
          break;
        case 'QPSK':
          score *= Math.abs(features.phaseStd - 0.78) < 0.3 ? 2 : 0.5;
          break;
        case 'OFDM':
          score *= features.spectralFlatness > 0.7 ? 2 : 0.5;
          score *= features.peakToAverage > 8 ? 2 : 0.5;
          break;
        case 'FSK':
          score *= features.spectralFlatness < 0.3 ? 1.5 : 0.5;
          break;
        default:
          score *= 0.5;
      }

      scores.set(mod, score);
    }

    return scores;
  }
}
