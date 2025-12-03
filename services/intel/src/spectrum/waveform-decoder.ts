/**
 * SIGINT Waveform Decoder
 *
 * Implements spectrum analysis and waveform characterization for
 * signals intelligence processing. Uses FFT-based spectral analysis
 * with modulation classification and parameter extraction.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SpectrumSample,
  WaveformCharacteristics,
  ModulationType,
  SpectralPeak,
  ConfidenceLevel,
  SpectrumBand,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configuration for waveform analysis
 */
export interface WaveformDecoderConfig {
  fftSize: number; // Must be power of 2
  windowFunction: 'HANN' | 'HAMMING' | 'BLACKMAN' | 'RECTANGULAR';
  peakThresholdDb: number; // Threshold above noise floor
  minPeakSeparationHz: number;
  maxHarmonics: number;
  modulationClassifierEnabled: boolean;
}

const DEFAULT_CONFIG: WaveformDecoderConfig = {
  fftSize: 4096,
  windowFunction: 'HANN',
  peakThresholdDb: 10,
  minPeakSeparationHz: 100,
  maxHarmonics: 8,
  modulationClassifierEnabled: true,
};

/**
 * WaveformDecoder - Analyzes RF spectrum data to extract waveform characteristics
 */
export class WaveformDecoder {
  private config: WaveformDecoderConfig;
  private windowCoefficients: Float64Array;

  constructor(config: Partial<WaveformDecoderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.windowCoefficients = this.computeWindowCoefficients();
  }

  /**
   * Analyze spectrum samples to extract waveform characteristics
   */
  async analyzeWaveform(
    samples: SpectrumSample[],
    sampleRate: number,
  ): Promise<WaveformCharacteristics> {
    const startTime = Date.now();

    if (samples.length === 0) {
      throw new Error('No samples provided for analysis');
    }

    // Extract power values for FFT
    const powerValues = samples.map((s) => s.powerDbm);
    const frequencyRange = {
      min: Math.min(...samples.map((s) => s.frequencyHz)),
      max: Math.max(...samples.map((s) => s.frequencyHz)),
    };

    // Perform spectral analysis
    const spectralData = await this.performSpectralAnalysis(
      powerValues,
      sampleRate,
    );

    // Detect spectral peaks
    const peaks = this.detectSpectralPeaks(
      spectralData,
      sampleRate,
      frequencyRange.min,
    );

    // Estimate center frequency and bandwidth
    const { centerFrequency, bandwidth } = this.estimateBandwidth(
      peaks,
      samples,
    );

    // Classify modulation type
    const modulation = this.config.modulationClassifierEnabled
      ? await this.classifyModulation(spectralData, peaks)
      : { type: 'UNKNOWN' as ModulationType, confidence: 'LOW' as ConfidenceLevel };

    // Detect harmonics
    const harmonics = this.detectHarmonics(peaks, centerFrequency);

    // Extract timing parameters if applicable
    const timingParams = this.extractTimingParameters(samples);

    const analysisTime = Date.now() - startTime;
    logger.debug({
      message: 'Waveform analysis completed',
      analysisTimeMs: analysisTime,
      peaksDetected: peaks.length,
      centerFrequencyHz: centerFrequency,
      bandwidthHz: bandwidth,
    });

    return {
      id: uuidv4(),
      centerFrequencyHz: centerFrequency,
      bandwidthHz: bandwidth,
      modulationType: modulation.type,
      spectralPeaks: peaks,
      harmonics,
      confidence: modulation.confidence,
      ...timingParams,
    };
  }

  /**
   * Perform FFT-based spectral analysis
   */
  private async performSpectralAnalysis(
    powerValues: number[],
    sampleRate: number,
  ): Promise<{ magnitude: Float64Array; phase: Float64Array; freqBins: Float64Array }> {
    const n = this.config.fftSize;

    // Pad or truncate to FFT size
    const paddedData = new Float64Array(n);
    const copyLength = Math.min(powerValues.length, n);
    for (let i = 0; i < copyLength; i++) {
      // Apply window function and convert from dBm to linear
      paddedData[i] = Math.pow(10, powerValues[i] / 10) * this.windowCoefficients[i % n];
    }

    // Perform FFT using Cooley-Tukey algorithm
    const { real, imag } = this.fft(paddedData);

    // Compute magnitude and phase
    const magnitude = new Float64Array(n / 2);
    const phase = new Float64Array(n / 2);
    const freqBins = new Float64Array(n / 2);

    for (let i = 0; i < n / 2; i++) {
      magnitude[i] = 10 * Math.log10(
        Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) + 1e-10,
      );
      phase[i] = Math.atan2(imag[i], real[i]);
      freqBins[i] = (i * sampleRate) / n;
    }

    return { magnitude, phase, freqBins };
  }

  /**
   * Cooley-Tukey FFT implementation
   */
  private fft(data: Float64Array): { real: Float64Array; imag: Float64Array } {
    const n = data.length;
    const real = new Float64Array(n);
    const imag = new Float64Array(n);

    // Copy input to real array
    for (let i = 0; i < n; i++) {
      real[i] = data[i];
    }

    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
      let k = n / 2;
      while (k <= j) {
        j -= k;
        k /= 2;
      }
      j += k;
    }

    // Cooley-Tukey decimation-in-time FFT
    for (let len = 2; len <= n; len *= 2) {
      const halfLen = len / 2;
      const phaseStep = -Math.PI / halfLen;
      for (let i = 0; i < n; i += len) {
        let phase = 0;
        for (let k = 0; k < halfLen; k++) {
          const cos = Math.cos(phase);
          const sin = Math.sin(phase);
          const tReal = real[i + k + halfLen] * cos - imag[i + k + halfLen] * sin;
          const tImag = real[i + k + halfLen] * sin + imag[i + k + halfLen] * cos;
          real[i + k + halfLen] = real[i + k] - tReal;
          imag[i + k + halfLen] = imag[i + k] - tImag;
          real[i + k] += tReal;
          imag[i + k] += tImag;
          phase += phaseStep;
        }
      }
    }

    return { real, imag };
  }

  /**
   * Detect spectral peaks above threshold
   */
  private detectSpectralPeaks(
    spectralData: { magnitude: Float64Array; phase: Float64Array; freqBins: Float64Array },
    sampleRate: number,
    baseFrequency: number,
  ): SpectralPeak[] {
    const { magnitude, phase, freqBins } = spectralData;
    const peaks: SpectralPeak[] = [];

    // Estimate noise floor using median
    const sortedMag = [...magnitude].sort((a, b) => a - b);
    const noiseFloor = sortedMag[Math.floor(sortedMag.length * 0.3)];
    const threshold = noiseFloor + this.config.peakThresholdDb;

    // Find local maxima above threshold
    for (let i = 2; i < magnitude.length - 2; i++) {
      if (
        magnitude[i] > threshold &&
        magnitude[i] > magnitude[i - 1] &&
        magnitude[i] > magnitude[i + 1] &&
        magnitude[i] > magnitude[i - 2] &&
        magnitude[i] > magnitude[i + 2]
      ) {
        // Check minimum separation from existing peaks
        const freq = baseFrequency + freqBins[i];
        const tooClose = peaks.some(
          (p) => Math.abs(p.frequencyHz - freq) < this.config.minPeakSeparationHz,
        );

        if (!tooClose) {
          // Estimate 3dB bandwidth using parabolic interpolation
          const bandwidth3dB = this.estimate3dBBandwidth(magnitude, i, sampleRate);

          peaks.push({
            frequencyHz: freq,
            magnitudeDb: magnitude[i],
            phaseRadians: phase[i],
            bandwidth3dBHz: bandwidth3dB,
          });
        }
      }
    }

    // Sort by magnitude and limit
    return peaks
      .sort((a, b) => b.magnitudeDb - a.magnitudeDb)
      .slice(0, 20);
  }

  /**
   * Estimate 3dB bandwidth around a peak
   */
  private estimate3dBBandwidth(
    magnitude: Float64Array,
    peakIndex: number,
    sampleRate: number,
  ): number {
    const peakMag = magnitude[peakIndex];
    const threshold = peakMag - 3;

    // Find lower bound
    let lowerBound = peakIndex;
    while (lowerBound > 0 && magnitude[lowerBound] > threshold) {
      lowerBound--;
    }

    // Find upper bound
    let upperBound = peakIndex;
    while (upperBound < magnitude.length - 1 && magnitude[upperBound] > threshold) {
      upperBound++;
    }

    const binWidth = sampleRate / (magnitude.length * 2);
    return (upperBound - lowerBound) * binWidth;
  }

  /**
   * Classify modulation type based on spectral features
   */
  private async classifyModulation(
    spectralData: { magnitude: Float64Array; phase: Float64Array; freqBins: Float64Array },
    peaks: SpectralPeak[],
  ): Promise<{ type: ModulationType; confidence: ConfidenceLevel }> {
    if (peaks.length === 0) {
      return { type: 'UNKNOWN', confidence: 'LOW' };
    }

    // Compute spectral features for classification
    const features = this.computeSpectralFeatures(spectralData, peaks);

    // Rule-based classification (could be replaced with ML model)
    return this.classifyByFeatures(features);
  }

  /**
   * Compute features for modulation classification
   */
  private computeSpectralFeatures(
    spectralData: { magnitude: Float64Array; phase: Float64Array; freqBins: Float64Array },
    peaks: SpectralPeak[],
  ): ModulationFeatures {
    const { magnitude, phase } = spectralData;

    // Spectral flatness (measure of noise-like vs tonal)
    const geometricMean = Math.exp(
      magnitude.reduce((sum, m) => sum + Math.log(Math.max(m + 100, 1e-10)), 0) /
        magnitude.length,
    );
    const arithmeticMean =
      magnitude.reduce((sum, m) => sum + m + 100, 0) / magnitude.length;
    const spectralFlatness = geometricMean / (arithmeticMean + 1e-10);

    // Spectral centroid
    let centroidNum = 0;
    let centroidDen = 0;
    for (let i = 0; i < magnitude.length; i++) {
      const linearMag = Math.pow(10, magnitude[i] / 10);
      centroidNum += i * linearMag;
      centroidDen += linearMag;
    }
    const spectralCentroid = centroidNum / (centroidDen + 1e-10);

    // Peak-to-average ratio
    const peakPower = Math.max(...magnitude);
    const avgPower =
      magnitude.reduce((sum, m) => sum + m, 0) / magnitude.length;
    const peakToAverage = peakPower - avgPower;

    // Phase variance (indicator of phase modulation)
    const meanPhase =
      phase.reduce((sum, p) => sum + p, 0) / phase.length;
    const phaseVariance =
      phase.reduce((sum, p) => sum + Math.pow(p - meanPhase, 2), 0) /
      phase.length;

    // Number of significant peaks
    const significantPeaks = peaks.filter((p) => p.magnitudeDb > avgPower + 10);

    return {
      spectralFlatness,
      spectralCentroid,
      peakToAverage,
      phaseVariance,
      peakCount: significantPeaks.length,
      bandwidthRatio:
        peaks.length > 0
          ? peaks[0].bandwidth3dBHz / (peaks[0].frequencyHz + 1)
          : 0,
    };
  }

  /**
   * Classify modulation based on computed features
   */
  private classifyByFeatures(
    features: ModulationFeatures,
  ): { type: ModulationType; confidence: ConfidenceLevel } {
    const {
      spectralFlatness,
      peakToAverage,
      phaseVariance,
      peakCount,
      bandwidthRatio,
    } = features;

    // FHSS detection - high spectral flatness, multiple peaks
    if (spectralFlatness > 0.7 && peakCount > 5) {
      return { type: 'FHSS', confidence: 'MEDIUM' };
    }

    // DSSS detection - noise-like spectrum
    if (spectralFlatness > 0.8 && bandwidthRatio > 0.5) {
      return { type: 'DSSS', confidence: 'MEDIUM' };
    }

    // OFDM detection - multiple equally spaced peaks
    if (peakCount >= 4 && bandwidthRatio > 0.1) {
      return { type: 'OFDM', confidence: 'MEDIUM' };
    }

    // FM detection - single peak with moderate bandwidth
    if (peakCount <= 2 && bandwidthRatio > 0.01 && bandwidthRatio < 0.1) {
      return { type: 'FM', confidence: 'MEDIUM' };
    }

    // AM detection - carrier + sidebands
    if (peakCount === 3 && peakToAverage > 15) {
      return { type: 'AM', confidence: 'MEDIUM' };
    }

    // PSK detection - high phase variance
    if (phaseVariance > 1.5 && peakCount <= 2) {
      return { type: 'PSK', confidence: 'LOW' };
    }

    // FSK detection - dual peaks
    if (peakCount === 2 && peakToAverage > 10) {
      return { type: 'FSK', confidence: 'LOW' };
    }

    // QAM - complex constellation
    if (phaseVariance > 0.5 && phaseVariance < 1.5 && bandwidthRatio > 0.05) {
      return { type: 'QAM', confidence: 'LOW' };
    }

    return { type: 'UNKNOWN', confidence: 'LOW' };
  }

  /**
   * Estimate bandwidth from peaks
   */
  private estimateBandwidth(
    peaks: SpectralPeak[],
    samples: SpectrumSample[],
  ): { centerFrequency: number; bandwidth: number } {
    if (peaks.length === 0) {
      const avgFreq =
        samples.reduce((sum, s) => sum + s.frequencyHz, 0) / samples.length;
      return { centerFrequency: avgFreq, bandwidth: 0 };
    }

    // Use weighted average of peak frequencies
    let weightedSum = 0;
    let totalWeight = 0;
    let minFreq = Infinity;
    let maxFreq = -Infinity;

    for (const peak of peaks) {
      const linearMag = Math.pow(10, peak.magnitudeDb / 10);
      weightedSum += peak.frequencyHz * linearMag;
      totalWeight += linearMag;
      minFreq = Math.min(minFreq, peak.frequencyHz - peak.bandwidth3dBHz / 2);
      maxFreq = Math.max(maxFreq, peak.frequencyHz + peak.bandwidth3dBHz / 2);
    }

    return {
      centerFrequency: weightedSum / totalWeight,
      bandwidth: maxFreq - minFreq,
    };
  }

  /**
   * Detect harmonic frequencies
   */
  private detectHarmonics(
    peaks: SpectralPeak[],
    fundamentalFreq: number,
  ): number[] {
    const harmonics: number[] = [];
    const tolerance = 0.02; // 2% frequency tolerance

    for (let h = 2; h <= this.config.maxHarmonics; h++) {
      const expectedFreq = fundamentalFreq * h;
      const matchingPeak = peaks.find(
        (p) =>
          Math.abs(p.frequencyHz - expectedFreq) / expectedFreq < tolerance,
      );
      if (matchingPeak) {
        harmonics.push(matchingPeak.frequencyHz);
      }
    }

    return harmonics;
  }

  /**
   * Extract timing parameters for pulsed signals
   */
  private extractTimingParameters(
    samples: SpectrumSample[],
  ): Partial<WaveformCharacteristics> {
    if (samples.length < 10) {
      return {};
    }

    // Detect ON/OFF transitions for pulse analysis
    const avgPower =
      samples.reduce((sum, s) => sum + s.powerDbm, 0) / samples.length;
    const threshold = avgPower + 3;

    const pulseEdges: { index: number; rising: boolean }[] = [];
    let wasAboveThreshold = samples[0].powerDbm > threshold;

    for (let i = 1; i < samples.length; i++) {
      const isAboveThreshold = samples[i].powerDbm > threshold;
      if (isAboveThreshold !== wasAboveThreshold) {
        pulseEdges.push({ index: i, rising: isAboveThreshold });
        wasAboveThreshold = isAboveThreshold;
      }
    }

    if (pulseEdges.length < 2) {
      return {};
    }

    // Calculate pulse repetition interval
    const risingEdges = pulseEdges.filter((e) => e.rising);
    if (risingEdges.length < 2) {
      return {};
    }

    const intervals: number[] = [];
    for (let i = 1; i < risingEdges.length; i++) {
      const dt =
        samples[risingEdges[i].index].timestamp.getTime() -
        samples[risingEdges[i - 1].index].timestamp.getTime();
      intervals.push(dt);
    }

    const avgInterval =
      intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const pulseRepetitionHz = avgInterval > 0 ? 1000 / avgInterval : 0;

    // Calculate pulse width
    let totalPulseWidth = 0;
    let pulseCount = 0;
    for (let i = 0; i < pulseEdges.length - 1; i++) {
      if (pulseEdges[i].rising && !pulseEdges[i + 1].rising) {
        const width =
          samples[pulseEdges[i + 1].index].timestamp.getTime() -
          samples[pulseEdges[i].index].timestamp.getTime();
        totalPulseWidth += width;
        pulseCount++;
      }
    }

    const avgPulseWidthUs =
      pulseCount > 0 ? (totalPulseWidth / pulseCount) * 1000 : undefined;
    const dutyCycle =
      avgPulseWidthUs && avgInterval > 0
        ? avgPulseWidthUs / (avgInterval * 1000)
        : undefined;

    return {
      pulseWidthUs: avgPulseWidthUs,
      pulseRepetitionHz,
      dutyCycle,
    };
  }

  /**
   * Compute window coefficients for FFT
   */
  private computeWindowCoefficients(): Float64Array {
    const n = this.config.fftSize;
    const coefficients = new Float64Array(n);

    switch (this.config.windowFunction) {
      case 'HANN':
        for (let i = 0; i < n; i++) {
          coefficients[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
        }
        break;
      case 'HAMMING':
        for (let i = 0; i < n; i++) {
          coefficients[i] =
            0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
        }
        break;
      case 'BLACKMAN':
        for (let i = 0; i < n; i++) {
          coefficients[i] =
            0.42 -
            0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) +
            0.08 * Math.cos((4 * Math.PI * i) / (n - 1));
        }
        break;
      case 'RECTANGULAR':
      default:
        coefficients.fill(1);
        break;
    }

    return coefficients;
  }

  /**
   * Get spectrum band classification
   */
  static classifyBand(frequencyHz: number): SpectrumBand {
    if (frequencyHz < 30e3) return 'VLF';
    if (frequencyHz < 300e3) return 'LF';
    if (frequencyHz < 3e6) return 'MF';
    if (frequencyHz < 30e6) return 'HF';
    if (frequencyHz < 300e6) return 'VHF';
    if (frequencyHz < 3e9) return 'UHF';
    if (frequencyHz < 30e9) return 'SHF';
    if (frequencyHz < 300e9) return 'EHF';
    return 'THF';
  }
}

/**
 * Modulation classification features
 */
interface ModulationFeatures {
  spectralFlatness: number;
  spectralCentroid: number;
  peakToAverage: number;
  phaseVariance: number;
  peakCount: number;
  bandwidthRatio: number;
}

export default WaveformDecoder;
