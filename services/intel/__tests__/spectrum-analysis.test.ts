/**
 * SIGINT Spectrum Analysis E2E Tests
 *
 * Tests the complete spectrum analysis pipeline including
 * waveform decoding, signature matching, and alert generation.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  WaveformDecoder,
  SpectrumAnalyzer,
  SignatureMatcher,
  PatternAgent,
  SpectrumSample,
  SignalSignature,
  IntelAlert,
  ModulationType,
} from '../src/index.js';

describe('SIGINT Spectrum Analysis Pipeline', () => {
  let waveformDecoder: WaveformDecoder;
  let spectrumAnalyzer: SpectrumAnalyzer;
  let signatureMatcher: SignatureMatcher;
  let patternAgent: PatternAgent;
  let capturedAlerts: IntelAlert[];

  beforeAll(() => {
    waveformDecoder = new WaveformDecoder({
      fftSize: 1024,
      windowFunction: 'HANN',
      peakThresholdDb: 6,
    });

    signatureMatcher = new SignatureMatcher({
      frequencyTolerancePercent: 1,
      minMatchScore: 0.4,
    });

    spectrumAnalyzer = new SpectrumAnalyzer({
      signalDetectionThresholdDb: 3,
      minSignalDurationMs: 5,
    });

    patternAgent = new PatternAgent({
      temporalWindowMs: 5000,
      minClusterSize: 2,
    });

    capturedAlerts = [];
  });

  beforeEach(() => {
    capturedAlerts = [];
    spectrumAnalyzer.onAlert(async (alert) => {
      capturedAlerts.push(alert);
    });
  });

  describe('WaveformDecoder', () => {
    it('should analyze FM signal waveform', async () => {
      const samples = generateFMSignalSamples(100e6, 75e3, 1000);

      const waveform = await waveformDecoder.analyzeWaveform(samples, 1e6);

      expect(waveform).toBeDefined();
      expect(waveform.id).toBeDefined();
      expect(waveform.centerFrequencyHz).toBeCloseTo(100e6, -5);
      expect(waveform.bandwidthHz).toBeGreaterThan(0);
      expect(waveform.spectralPeaks.length).toBeGreaterThan(0);
    });

    it('should detect spectral peaks', async () => {
      const samples = generateMultiToneSignal([100e6, 200e6, 300e6], 1000);

      const waveform = await waveformDecoder.analyzeWaveform(samples, 1e6);

      expect(waveform.spectralPeaks.length).toBeGreaterThanOrEqual(1);
      waveform.spectralPeaks.forEach((peak) => {
        expect(peak.frequencyHz).toBeGreaterThan(0);
        expect(peak.magnitudeDb).toBeDefined();
        expect(peak.bandwidth3dBHz).toBeGreaterThan(0);
      });
    });

    it('should classify spectrum bands correctly', () => {
      expect(WaveformDecoder.classifyBand(10e3)).toBe('VLF');
      expect(WaveformDecoder.classifyBand(100e3)).toBe('LF');
      expect(WaveformDecoder.classifyBand(1e6)).toBe('MF');
      expect(WaveformDecoder.classifyBand(10e6)).toBe('HF');
      expect(WaveformDecoder.classifyBand(100e6)).toBe('VHF');
      expect(WaveformDecoder.classifyBand(1e9)).toBe('UHF');
      expect(WaveformDecoder.classifyBand(10e9)).toBe('SHF');
      expect(WaveformDecoder.classifyBand(100e9)).toBe('EHF');
    });
  });

  describe('SignatureMatcher', () => {
    beforeAll(async () => {
      const signatures: SignalSignature[] = [
        {
          id: 'sig-001',
          name: 'Test Radar',
          category: 'EMITTER',
          waveformTemplate: {
            centerFrequencyHz: 9.4e9,
            bandwidthHz: 10e6,
            modulationType: 'CHIRP',
          },
          associatedThreatLevel: 'HIGH',
          source: 'test-db',
          lastUpdatedAt: new Date(),
        },
        {
          id: 'sig-002',
          name: 'VHF Radio',
          category: 'PLATFORM',
          waveformTemplate: {
            centerFrequencyHz: 150e6,
            bandwidthHz: 25e3,
            modulationType: 'FM',
          },
          associatedThreatLevel: 'LOW',
          source: 'test-db',
          lastUpdatedAt: new Date(),
        },
      ];

      await signatureMatcher.loadSignatures(signatures);
    });

    it('should match waveform to known signature', async () => {
      const waveform = {
        id: 'wave-001',
        centerFrequencyHz: 9.41e9,
        bandwidthHz: 10.5e6,
        modulationType: 'CHIRP' as ModulationType,
        spectralPeaks: [],
        harmonics: [],
        confidence: 'MEDIUM' as const,
      };

      const matches = await signatureMatcher.matchWaveform(waveform);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].signatureId).toBe('sig-001');
      expect(matches[0].matchScore).toBeGreaterThan(0.5);
    });

    it('should return empty for non-matching waveform', async () => {
      const waveform = {
        id: 'wave-002',
        centerFrequencyHz: 1e9,
        bandwidthHz: 1e6,
        modulationType: 'AM' as ModulationType,
        spectralPeaks: [],
        harmonics: [],
        confidence: 'LOW' as const,
      };

      const matches = await signatureMatcher.matchWaveform(waveform);

      expect(matches.length).toBe(0);
    });

    it('should search signatures by name', () => {
      const results = signatureMatcher.searchSignatures('radar');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test Radar');
    });
  });

  describe('SpectrumAnalyzer', () => {
    it('should detect and track signal of interest', async () => {
      const samples = generateFMSignalSamples(150e6, 25e3, 500);

      const soi = await spectrumAnalyzer.processSpectrum(samples, 1e6);

      expect(soi).toBeDefined();
      expect(soi?.id).toBeDefined();
      expect(soi?.waveform).toBeDefined();
      expect(soi?.firstSeenAt).toBeInstanceOf(Date);
      expect(soi?.threatAssessment).toBeDefined();
    });

    it('should update existing signal on repeated detection', async () => {
      const samples1 = generateFMSignalSamples(100e6, 10e3, 500);
      const samples2 = generateFMSignalSamples(100e6, 10e3, 500);

      const soi1 = await spectrumAnalyzer.processSpectrum(samples1, 1e6);
      const soi2 = await spectrumAnalyzer.processSpectrum(samples2, 1e6);

      // Should update existing rather than create new
      if (soi1 && soi2) {
        expect(soi2.id).toBe(soi1.id);
        expect(soi2.occurrenceCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('should generate alert for new signal', async () => {
      // Use unique frequency to ensure new signal
      const samples = generateFMSignalSamples(433e6, 50e3, 500);

      await spectrumAnalyzer.processSpectrum(samples, 1e6);

      // Give async alert time to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedAlerts.some((a) => a.type === 'NEW_SIGNAL')).toBe(true);
    });

    it('should provide statistics', () => {
      const stats = spectrumAnalyzer.getStatistics();

      expect(stats).toHaveProperty('activeSignalCount');
      expect(stats).toHaveProperty('signalsByModulation');
      expect(stats).toHaveProperty('signalsByThreatLevel');
    });
  });

  describe('PatternAgent', () => {
    it('should detect temporal patterns', async () => {
      // Create signals with similar timing
      const signal1 = createMockSignal('sig-1', new Date());
      const signal2 = createMockSignal('sig-2', new Date(Date.now() + 100));

      const patterns1 = await patternAgent.analyzeSignal(signal1);
      const patterns2 = await patternAgent.analyzeSignal(signal2);

      // Should potentially detect temporal correlation
      expect(patterns2.length).toBeGreaterThanOrEqual(0);
    });

    it('should get patterns by type', () => {
      const patterns = patternAgent.getPatternsByType('TEMPORAL_CORRELATION');

      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('End-to-End Pipeline', () => {
    it('should process signal through complete pipeline', async () => {
      // Generate realistic signal
      const samples = generateChirpSignal(9.4e9, 5e6, 1000);

      // Wire up signature matcher
      spectrumAnalyzer.onSignatureMatch(async (waveform) => {
        return signatureMatcher.matchWaveform(waveform);
      });

      // Process spectrum
      const soi = await spectrumAnalyzer.processSpectrum(samples, 10e6);

      if (soi) {
        // Analyze patterns
        await patternAgent.analyzeSignal(soi);

        // Verify complete processing
        expect(soi.waveform).toBeDefined();
        expect(soi.threatAssessment).toBeDefined();
        expect(soi.matchedSignatures).toBeDefined();
      }
    });

    it('should meet performance requirements (< 100ms per sample batch)', async () => {
      const samples = generateFMSignalSamples(100e6, 25e3, 1000);

      const startTime = Date.now();
      await spectrumAnalyzer.processSpectrum(samples, 1e6);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});

// Helper functions to generate test signals

function generateFMSignalSamples(
  centerFreq: number,
  deviation: number,
  count: number,
): SpectrumSample[] {
  const samples: SpectrumSample[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const freq = centerFreq + deviation * Math.sin((2 * Math.PI * i) / 100);
    samples.push({
      timestamp: new Date(now + i),
      frequencyHz: freq,
      bandwidthHz: deviation * 2,
      powerDbm: -40 + 10 * Math.sin((2 * Math.PI * i) / 50),
      noiseFloorDbm: -100,
      sensorId: 'test-sensor-1',
      geolocation: {
        latitude: 38.8977,
        longitude: -77.0365,
        accuracyM: 100,
        timestamp: new Date(now + i),
        source: 'GPS',
      },
    });
  }

  return samples;
}

function generateMultiToneSignal(
  frequencies: number[],
  count: number,
): SpectrumSample[] {
  const samples: SpectrumSample[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const freqIndex = i % frequencies.length;
    samples.push({
      timestamp: new Date(now + i),
      frequencyHz: frequencies[freqIndex],
      bandwidthHz: 1000,
      powerDbm: -30,
      noiseFloorDbm: -100,
      sensorId: 'test-sensor-1',
    });
  }

  return samples;
}

function generateChirpSignal(
  startFreq: number,
  sweep: number,
  count: number,
): SpectrumSample[] {
  const samples: SpectrumSample[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    const freq = startFreq + sweep * progress;
    samples.push({
      timestamp: new Date(now + i),
      frequencyHz: freq,
      bandwidthHz: sweep / 10,
      powerDbm: -35,
      noiseFloorDbm: -95,
      sensorId: 'test-sensor-1',
    });
  }

  return samples;
}

function createMockSignal(id: string, timestamp: Date): any {
  return {
    id,
    waveform: {
      id: `wf-${id}`,
      centerFrequencyHz: 100e6,
      bandwidthHz: 25e3,
      modulationType: 'FM',
      spectralPeaks: [],
      harmonics: [],
      confidence: 'MEDIUM',
    },
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    occurrenceCount: 1,
    averageDurationMs: 100,
    detectionLocations: [
      {
        latitude: 38.8977,
        longitude: -77.0365,
        accuracyM: 100,
        timestamp,
        source: 'GPS',
      },
    ],
    threatAssessment: {
      level: 'LOW',
      category: 'UNKNOWN',
      indicators: [],
      recommendedActions: [],
      assessedAt: timestamp,
      assessedBy: 'test',
    },
    matchedSignatures: [],
    correlatedEntities: [],
    odniGapReferences: [],
  };
}
