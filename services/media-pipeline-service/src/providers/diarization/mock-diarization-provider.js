"use strict";
/**
 * Mock Diarization Provider
 *
 * A mock implementation of the diarization provider for testing and development.
 * Generates synthetic speaker diarization results.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDiarizationProvider = void 0;
const base_js_1 = require("../base.js");
const logger_js_1 = require("../../utils/logger.js");
class MockDiarizationProvider extends base_js_1.BaseProvider {
    id = 'mock-diarization';
    name = 'Mock Diarization Provider';
    supportedFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'webm', 'mp4'];
    maxDurationMs = 4 * 60 * 60 * 1000; // 4 hours
    maxSpeakers = 20;
    processingDelayMs = 100;
    async initialize(config) {
        await super.initialize(config);
        if (config.options?.processingDelayMs) {
            this.processingDelayMs = config.options.processingDelayMs;
        }
        logger_js_1.logger.info({ providerId: this.id }, 'Mock diarization provider initialized');
    }
    async healthCheck() {
        return this.createHealthResult('available', 10);
    }
    async diarize(request) {
        this.ensureInitialized();
        const startTime = Date.now();
        const duration = request.mediaAsset.metadata?.duration || 60000;
        const speakerCount = request.expectedSpeakerCount || Math.min(3, request.maxSpeakers || 3);
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, this.processingDelayMs));
        // Generate mock speaker segments
        const { speakers, segments, timeline } = this.generateMockDiarization(duration, speakerCount);
        const processingTimeMs = Date.now() - startTime;
        logger_js_1.logger.info({
            providerId: this.id,
            mediaAssetId: request.mediaAsset.id,
            duration,
            speakerCount: speakers.length,
            segmentCount: segments.length,
            processingTimeMs,
        }, 'Mock diarization completed');
        return {
            success: true,
            speakers,
            speakerCount: speakers.length,
            segments,
            timeline,
            provider: this.id,
            modelVersion: '1.0.0-mock',
            processingTimeMs,
        };
    }
    estimateCost(durationMs) {
        // Mock: $0.01 per minute
        return (durationMs / 60000) * 0.01;
    }
    generateMockDiarization(duration, speakerCount) {
        const segments = [];
        const timeline = [];
        const speakerDurations = new Map();
        // Generate segments with alternating speakers
        const segmentDuration = 5000; // 5 seconds per segment
        const numSegments = Math.ceil(duration / segmentDuration);
        for (let i = 0; i < numSegments; i++) {
            const speakerIndex = i % speakerCount;
            const speakerLabel = `SPEAKER_0${speakerIndex}`;
            const startTime = i * segmentDuration;
            const endTime = Math.min((i + 1) * segmentDuration, duration);
            const segmentLength = endTime - startTime;
            const segment = {
                speakerLabel,
                startTime,
                endTime,
                confidence: 0.85 + Math.random() * 0.15,
            };
            segments.push(segment);
            // Track duration per speaker
            const currentDuration = speakerDurations.get(speakerLabel) || 0;
            speakerDurations.set(speakerLabel, currentDuration + segmentLength);
            // Add timeline events
            timeline.push({ time: startTime, speaker: speakerLabel, event: 'start' });
            timeline.push({ time: endTime, speaker: speakerLabel, event: 'end' });
        }
        // Sort timeline by time
        timeline.sort((a, b) => a.time - b.time);
        // Create speaker profiles
        const speakers = [];
        for (let i = 0; i < speakerCount; i++) {
            const label = `SPEAKER_0${i}`;
            const speakerSegments = segments.filter((s) => s.speakerLabel === label);
            const totalDuration = speakerDurations.get(label) || 0;
            speakers.push({
                label,
                segments: speakerSegments,
                totalDuration,
                speakingRatio: totalDuration / duration,
                averageConfidence: speakerSegments.reduce((sum, s) => sum + s.confidence, 0) / speakerSegments.length,
                estimatedGender: i % 2 === 0 ? 'male' : 'female',
                voiceFeatures: {
                    pitchMean: 100 + i * 50 + Math.random() * 20,
                    pitchStd: 10 + Math.random() * 5,
                    energyMean: 0.5 + Math.random() * 0.3,
                },
            });
        }
        return { speakers, segments, timeline };
    }
}
exports.MockDiarizationProvider = MockDiarizationProvider;
