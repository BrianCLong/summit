"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioSentimentAnalyzer = void 0;
/**
 * AudioSentimentAnalyzer
 *
 * Performs sentiment and emotion analysis on audio streams/buffers.
 * Implements feature extraction (RMS, ZCR, Pitch) and emotion classification.
 *
 * Note: DSP is simulated where native libraries are unavailable.
 */
class AudioSentimentAnalyzer {
    sampleRate;
    constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
    }
    /**
     * Extract features from an audio buffer (Float32Array or Node Buffer)
     */
    async extractFeatures(buffer) {
        const data = buffer instanceof Buffer ? this.bufferToFloat32(buffer) : buffer;
        const rms = this.calculateRMS(data);
        const zcr = this.calculateZCR(data);
        const pitch = this.estimatePitch(data); // Simulated/Simplified
        const spectralCentroid = this.estimateSpectralCentroid(data);
        return {
            rms,
            zcr,
            pitch,
            spectralCentroid,
            duration: data.length / this.sampleRate
        };
    }
    /**
     * Classify emotion based on extracted features
     */
    async classifyEmotion(features) {
        // Heuristic-based classification (Mocking a trained model)
        // High pitch + High energy -> Angry/Happy/Fear
        // Low pitch + Low energy -> Sad/Neutral
        const { rms, pitch, zcr } = features;
        // Normalize features roughly
        const normRMS = Math.min(rms * 10, 1.0); // Assume typical RMS is low
        const normPitch = Math.min(pitch / 1000, 1.0);
        let scores = {
            neutral: 0.2,
            happy: 0.2,
            sad: 0.2,
            angry: 0.2,
            fearful: 0.2
        };
        if (normRMS > 0.6) {
            // High energy
            if (pitch > 400) {
                scores.fearful += 0.4;
                scores.happy += 0.2;
            }
            else {
                scores.angry += 0.5;
            }
        }
        else {
            // Low energy
            if (pitch < 200) {
                scores.sad += 0.4;
                scores.neutral += 0.3;
            }
            else {
                scores.neutral += 0.5;
            }
        }
        // Normalize scores
        const sum = Object.values(scores).reduce((a, b) => a + b, 0);
        for (const key in scores) {
            scores[key] /= sum;
        }
        // Determine sentiment
        const positive = scores.happy;
        const negative = scores.angry + scores.sad + scores.fearful;
        const neutral = scores.neutral;
        let sentimentLabel = 'neutral';
        if (positive > negative && positive > neutral)
            sentimentLabel = 'positive';
        if (negative > positive && negative > neutral)
            sentimentLabel = 'negative';
        return {
            timestamp: Date.now(),
            duration: features.duration,
            features,
            emotions: scores,
            sentiment: {
                score: positive - negative,
                label: sentimentLabel,
                confidence: Math.max(positive, negative, neutral)
            }
        };
    }
    /**
     * Speaker Diarization (Simulated)
     * Splits audio into segments by speaker
     */
    async diarize(buffer) {
        // In a real implementation, this would use clustering on MFCC vectors.
        // Here we simulate it based on simple energy segmentation or random for MVP.
        const duration = buffer.length / (this.sampleRate * 2); // Assuming 16-bit
        return [
            { speakerId: 'SPEAKER_01', start: 0, end: duration / 2 },
            { speakerId: 'SPEAKER_02', start: duration / 2, end: duration }
        ];
    }
    /**
     * Process a batch of audio buffers
     */
    async processBatch(buffers) {
        const results = [];
        for (const buffer of buffers) {
            const features = await this.extractFeatures(buffer);
            results.push(await this.classifyEmotion(features));
        }
        return results;
    }
    // --- DSP Helpers ---
    bufferToFloat32(buffer) {
        // Assume 16-bit PCM little-endian
        const data = new Float32Array(buffer.length / 2);
        for (let i = 0; i < data.length; i++) {
            const int16 = buffer.readInt16LE(i * 2);
            data[i] = int16 / 32768.0;
        }
        return data;
    }
    calculateRMS(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
    }
    calculateZCR(data) {
        let crossings = 0;
        for (let i = 1; i < data.length; i++) {
            if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
                crossings++;
            }
        }
        return crossings / data.length;
    }
    estimatePitch(data) {
        // Simple Zero Crossing Rate based pitch estimation
        const zcr = this.calculateZCR(data);
        return zcr * this.sampleRate / 2;
    }
    estimateSpectralCentroid(data) {
        // Without FFT, we can map ZCR to a centroid proxy
        return this.calculateZCR(data) * 1000;
    }
}
exports.AudioSentimentAnalyzer = AudioSentimentAnalyzer;
