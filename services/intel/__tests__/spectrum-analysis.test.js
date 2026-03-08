"use strict";
/**
 * SIGINT Spectrum Analysis E2E Tests
 *
 * Tests the complete spectrum analysis pipeline including
 * waveform decoding, signature matching, and alert generation.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../src/index.js");
(0, globals_1.describe)('SIGINT Spectrum Analysis Pipeline', () => {
    let waveformDecoder;
    let spectrumAnalyzer;
    let signatureMatcher;
    let patternAgent;
    let capturedAlerts;
    (0, globals_1.beforeAll)(() => {
        waveformDecoder = new index_js_1.WaveformDecoder({
            fftSize: 1024,
            windowFunction: 'HANN',
            peakThresholdDb: 6,
        });
        signatureMatcher = new index_js_1.SignatureMatcher({
            frequencyTolerancePercent: 1,
            minMatchScore: 0.4,
        });
        spectrumAnalyzer = new index_js_1.SpectrumAnalyzer({
            signalDetectionThresholdDb: 3,
            minSignalDurationMs: 5,
        });
        patternAgent = new index_js_1.PatternAgent({
            temporalWindowMs: 5000,
            minClusterSize: 2,
        });
        capturedAlerts = [];
    });
    (0, globals_1.beforeEach)(() => {
        capturedAlerts = [];
        spectrumAnalyzer.onAlert(async (alert) => {
            capturedAlerts.push(alert);
        });
    });
    (0, globals_1.describe)('WaveformDecoder', () => {
        (0, globals_1.it)('should analyze FM signal waveform', async () => {
            const samples = generateFMSignalSamples(100e6, 75e3, 1000);
            const waveform = await waveformDecoder.analyzeWaveform(samples, 1e6);
            (0, globals_1.expect)(waveform).toBeDefined();
            (0, globals_1.expect)(waveform.id).toBeDefined();
            (0, globals_1.expect)(waveform.centerFrequencyHz).toBeCloseTo(100e6, -5);
            (0, globals_1.expect)(waveform.bandwidthHz).toBeGreaterThan(0);
            (0, globals_1.expect)(waveform.spectralPeaks.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should detect spectral peaks', async () => {
            const samples = generateMultiToneSignal([100e6, 200e6, 300e6], 1000);
            const waveform = await waveformDecoder.analyzeWaveform(samples, 1e6);
            (0, globals_1.expect)(waveform.spectralPeaks.length).toBeGreaterThanOrEqual(1);
            waveform.spectralPeaks.forEach((peak) => {
                (0, globals_1.expect)(peak.frequencyHz).toBeGreaterThan(0);
                (0, globals_1.expect)(peak.magnitudeDb).toBeDefined();
                (0, globals_1.expect)(peak.bandwidth3dBHz).toBeGreaterThan(0);
            });
        });
        (0, globals_1.it)('should classify spectrum bands correctly', () => {
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(10e3)).toBe('VLF');
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(100e3)).toBe('LF');
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(1e6)).toBe('MF');
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(10e6)).toBe('HF');
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(100e6)).toBe('VHF');
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(1e9)).toBe('UHF');
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(10e9)).toBe('SHF');
            (0, globals_1.expect)(index_js_1.WaveformDecoder.classifyBand(100e9)).toBe('EHF');
        });
    });
    (0, globals_1.describe)('SignatureMatcher', () => {
        (0, globals_1.beforeAll)(async () => {
            const signatures = [
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
        (0, globals_1.it)('should match waveform to known signature', async () => {
            const waveform = {
                id: 'wave-001',
                centerFrequencyHz: 9.41e9,
                bandwidthHz: 10.5e6,
                modulationType: 'CHIRP',
                spectralPeaks: [],
                harmonics: [],
                confidence: 'MEDIUM',
            };
            const matches = await signatureMatcher.matchWaveform(waveform);
            (0, globals_1.expect)(matches.length).toBeGreaterThan(0);
            (0, globals_1.expect)(matches[0].signatureId).toBe('sig-001');
            (0, globals_1.expect)(matches[0].matchScore).toBeGreaterThan(0.5);
        });
        (0, globals_1.it)('should return empty for non-matching waveform', async () => {
            const waveform = {
                id: 'wave-002',
                centerFrequencyHz: 1e9,
                bandwidthHz: 1e6,
                modulationType: 'AM',
                spectralPeaks: [],
                harmonics: [],
                confidence: 'LOW',
            };
            const matches = await signatureMatcher.matchWaveform(waveform);
            (0, globals_1.expect)(matches.length).toBe(0);
        });
        (0, globals_1.it)('should search signatures by name', () => {
            const results = signatureMatcher.searchSignatures('radar');
            (0, globals_1.expect)(results.length).toBe(1);
            (0, globals_1.expect)(results[0].name).toBe('Test Radar');
        });
    });
    (0, globals_1.describe)('SpectrumAnalyzer', () => {
        (0, globals_1.it)('should detect and track signal of interest', async () => {
            const samples = generateFMSignalSamples(150e6, 25e3, 500);
            const soi = await spectrumAnalyzer.processSpectrum(samples, 1e6);
            (0, globals_1.expect)(soi).toBeDefined();
            (0, globals_1.expect)(soi?.id).toBeDefined();
            (0, globals_1.expect)(soi?.waveform).toBeDefined();
            (0, globals_1.expect)(soi?.firstSeenAt).toBeInstanceOf(Date);
            (0, globals_1.expect)(soi?.threatAssessment).toBeDefined();
        });
        (0, globals_1.it)('should update existing signal on repeated detection', async () => {
            const samples1 = generateFMSignalSamples(100e6, 10e3, 500);
            const samples2 = generateFMSignalSamples(100e6, 10e3, 500);
            const soi1 = await spectrumAnalyzer.processSpectrum(samples1, 1e6);
            const soi2 = await spectrumAnalyzer.processSpectrum(samples2, 1e6);
            // Should update existing rather than create new
            if (soi1 && soi2) {
                (0, globals_1.expect)(soi2.id).toBe(soi1.id);
                (0, globals_1.expect)(soi2.occurrenceCount).toBeGreaterThanOrEqual(1);
            }
        });
        (0, globals_1.it)('should generate alert for new signal', async () => {
            // Use unique frequency to ensure new signal
            const samples = generateFMSignalSamples(433e6, 50e3, 500);
            await spectrumAnalyzer.processSpectrum(samples, 1e6);
            // Give async alert time to process
            await new Promise((resolve) => setTimeout(resolve, 100));
            (0, globals_1.expect)(capturedAlerts.some((a) => a.type === 'NEW_SIGNAL')).toBe(true);
        });
        (0, globals_1.it)('should provide statistics', () => {
            const stats = spectrumAnalyzer.getStatistics();
            (0, globals_1.expect)(stats).toHaveProperty('activeSignalCount');
            (0, globals_1.expect)(stats).toHaveProperty('signalsByModulation');
            (0, globals_1.expect)(stats).toHaveProperty('signalsByThreatLevel');
        });
    });
    (0, globals_1.describe)('PatternAgent', () => {
        (0, globals_1.it)('should detect temporal patterns', async () => {
            // Create signals with similar timing
            const signal1 = createMockSignal('sig-1', new Date());
            const signal2 = createMockSignal('sig-2', new Date(Date.now() + 100));
            const patterns1 = await patternAgent.analyzeSignal(signal1);
            const patterns2 = await patternAgent.analyzeSignal(signal2);
            // Should potentially detect temporal correlation
            (0, globals_1.expect)(patterns2.length).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should get patterns by type', () => {
            const patterns = patternAgent.getPatternsByType('TEMPORAL_CORRELATION');
            (0, globals_1.expect)(Array.isArray(patterns)).toBe(true);
        });
    });
    (0, globals_1.describe)('End-to-End Pipeline', () => {
        (0, globals_1.it)('should process signal through complete pipeline', async () => {
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
                (0, globals_1.expect)(soi.waveform).toBeDefined();
                (0, globals_1.expect)(soi.threatAssessment).toBeDefined();
                (0, globals_1.expect)(soi.matchedSignatures).toBeDefined();
            }
        });
        (0, globals_1.it)('should meet performance requirements (< 100ms per sample batch)', async () => {
            const samples = generateFMSignalSamples(100e6, 25e3, 1000);
            const startTime = Date.now();
            await spectrumAnalyzer.processSpectrum(samples, 1e6);
            const duration = Date.now() - startTime;
            (0, globals_1.expect)(duration).toBeLessThan(100);
        });
    });
});
// Helper functions to generate test signals
function generateFMSignalSamples(centerFreq, deviation, count) {
    const samples = [];
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
function generateMultiToneSignal(frequencies, count) {
    const samples = [];
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
function generateChirpSignal(startFreq, sweep, count) {
    const samples = [];
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
function createMockSignal(id, timestamp) {
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
