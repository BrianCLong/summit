"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDuration = calculateDuration;
exports.secondsToSamples = secondsToSamples;
exports.samplesToSeconds = samplesToSeconds;
exports.calculateBufferSize = calculateBufferSize;
exports.validateAudioMetadata = validateAudioMetadata;
exports.normalizeAudio = normalizeAudio;
exports.calculateRMS = calculateRMS;
exports.rmsToDb = rmsToDb;
exports.calculateSNR = calculateSNR;
exports.detectClipping = detectClipping;
exports.splitIntoChunks = splitIntoChunks;
exports.mergeChunks = mergeChunks;
exports.resampleLinear = resampleLinear;
exports.stereoToMono = stereoToMono;
exports.monoToStereo = monoToStereo;
exports.applyFade = applyFade;
exports.getSupportedFormats = getSupportedFormats;
exports.getStandardSampleRates = getStandardSampleRates;
exports.formatBytes = formatBytes;
exports.formatDuration = formatDuration;
exports.createChecksum = createChecksum;
exports.verifyChecksum = verifyChecksum;
const types_js_1 = require("./types.js");
/**
 * Calculate audio duration in seconds
 */
function calculateDuration(sampleCount, sampleRate, channels) {
    return sampleCount / (sampleRate * channels);
}
/**
 * Convert seconds to samples
 */
function secondsToSamples(seconds, sampleRate, channels) {
    return Math.floor(seconds * sampleRate * channels);
}
/**
 * Convert samples to seconds
 */
function samplesToSeconds(samples, sampleRate, channels) {
    return samples / (sampleRate * channels);
}
/**
 * Calculate buffer size for given duration
 */
function calculateBufferSize(duration, sampleRate, channels, bitDepth) {
    const samples = secondsToSamples(duration, sampleRate, channels);
    return samples * (bitDepth / 8);
}
/**
 * Validate audio metadata
 */
function validateAudioMetadata(metadata) {
    if (metadata.duration <= 0) {
        return false;
    }
    if (metadata.sampleRate <= 0) {
        return false;
    }
    if (metadata.channels <= 0) {
        return false;
    }
    if (metadata.bitDepth && metadata.bitDepth <= 0) {
        return false;
    }
    return true;
}
/**
 * Normalize audio level (-1 to 1)
 */
function normalizeAudio(buffer) {
    const max = Math.max(...Array.from(buffer).map(Math.abs));
    if (max === 0) {
        return buffer;
    }
    const normalized = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        normalized[i] = buffer[i] / max;
    }
    return normalized;
}
/**
 * Calculate RMS (Root Mean Square) level
 */
function calculateRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
}
/**
 * Convert RMS to dB
 */
function rmsToDb(rms) {
    return 20 * Math.log10(rms);
}
/**
 * Calculate signal-to-noise ratio
 */
function calculateSNR(signal, noise) {
    const signalRMS = calculateRMS(signal);
    const noiseRMS = calculateRMS(noise);
    if (noiseRMS === 0) {
        return Infinity;
    }
    return 20 * Math.log10(signalRMS / noiseRMS);
}
/**
 * Detect clipping in audio
 */
function detectClipping(buffer, threshold = 0.99) {
    let clippedSamples = 0;
    for (let i = 0; i < buffer.length; i++) {
        if (Math.abs(buffer[i]) >= threshold) {
            clippedSamples++;
        }
    }
    return clippedSamples / buffer.length;
}
/**
 * Split audio into chunks
 */
function splitIntoChunks(buffer, chunkSize, overlap = 0) {
    const chunks = [];
    const stride = chunkSize - overlap;
    for (let i = 0; i < buffer.length; i += stride) {
        const end = Math.min(i + chunkSize, buffer.length);
        const chunk = buffer.slice(i, end);
        chunks.push(chunk);
        if (end === buffer.length) {
            break;
        }
    }
    return chunks;
}
/**
 * Merge audio chunks
 */
function mergeChunks(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        if (Buffer.isBuffer(chunk)) {
            chunk.copy(merged, offset);
        }
        else {
            merged.set(chunk, offset);
        }
        offset += chunk.length;
    }
    return merged;
}
/**
 * Resample audio (simple linear interpolation)
 * Note: For production, use more sophisticated resampling libraries
 */
function resampleLinear(input, inputRate, outputRate) {
    if (inputRate === outputRate) {
        return input;
    }
    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        const position = i * ratio;
        const index = Math.floor(position);
        const fraction = position - index;
        if (index + 1 < input.length) {
            output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
        }
        else {
            output[i] = input[index];
        }
    }
    return output;
}
/**
 * Convert stereo to mono
 */
function stereoToMono(left, right) {
    const mono = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
        mono[i] = (left[i] + right[i]) / 2;
    }
    return mono;
}
/**
 * Convert mono to stereo
 */
function monoToStereo(mono) {
    return {
        left: new Float32Array(mono),
        right: new Float32Array(mono)
    };
}
/**
 * Apply fade in/out
 */
function applyFade(buffer, fadeInSamples, fadeOutSamples) {
    const faded = new Float32Array(buffer);
    // Fade in
    for (let i = 0; i < fadeInSamples && i < buffer.length; i++) {
        faded[i] *= i / fadeInSamples;
    }
    // Fade out
    const fadeOutStart = buffer.length - fadeOutSamples;
    for (let i = 0; i < fadeOutSamples && fadeOutStart + i < buffer.length; i++) {
        faded[fadeOutStart + i] *= (fadeOutSamples - i) / fadeOutSamples;
    }
    return faded;
}
/**
 * Get supported audio formats
 */
function getSupportedFormats() {
    return Object.values(types_js_1.AudioFormat);
}
/**
 * Get standard sample rates
 */
function getStandardSampleRates() {
    return Object.values(types_js_1.SampleRate).filter((v) => typeof v === 'number');
}
/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) {
        return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
/**
 * Format duration to human readable
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    parts.push(`${secs}s`);
    return parts.join(' ');
}
/**
 * Create checksum of audio data
 */
async function createChecksum(data, algorithm = 'sha256') {
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
}
/**
 * Verify audio checksum
 */
async function verifyChecksum(data, expectedChecksum, algorithm = 'sha256') {
    const actualChecksum = await createChecksum(data, algorithm);
    return actualChecksum === expectedChecksum;
}
