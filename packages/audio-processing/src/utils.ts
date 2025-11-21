import type { AudioBuffer, AudioMetadata, AudioSegment } from './types.js';
import { AudioFormat, SampleRate } from './types.js';

/**
 * Calculate audio duration in seconds
 */
export function calculateDuration(
  sampleCount: number,
  sampleRate: number,
  channels: number
): number {
  return sampleCount / (sampleRate * channels);
}

/**
 * Convert seconds to samples
 */
export function secondsToSamples(seconds: number, sampleRate: number, channels: number): number {
  return Math.floor(seconds * sampleRate * channels);
}

/**
 * Convert samples to seconds
 */
export function samplesToSeconds(samples: number, sampleRate: number, channels: number): number {
  return samples / (sampleRate * channels);
}

/**
 * Calculate buffer size for given duration
 */
export function calculateBufferSize(
  duration: number,
  sampleRate: number,
  channels: number,
  bitDepth: number
): number {
  const samples = secondsToSamples(duration, sampleRate, channels);
  return samples * (bitDepth / 8);
}

/**
 * Validate audio metadata
 */
export function validateAudioMetadata(metadata: AudioMetadata): boolean {
  if (metadata.duration <= 0) return false;
  if (metadata.sampleRate <= 0) return false;
  if (metadata.channels <= 0) return false;
  if (metadata.bitDepth && metadata.bitDepth <= 0) return false;
  return true;
}

/**
 * Normalize audio level (-1 to 1)
 */
export function normalizeAudio(buffer: Float32Array): Float32Array {
  const max = Math.max(...Array.from(buffer).map(Math.abs));
  if (max === 0) return buffer;

  const normalized = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    normalized[i] = buffer[i] / max;
  }
  return normalized;
}

/**
 * Calculate RMS (Root Mean Square) level
 */
export function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Convert RMS to dB
 */
export function rmsToDb(rms: number): number {
  return 20 * Math.log10(rms);
}

/**
 * Calculate signal-to-noise ratio
 */
export function calculateSNR(signal: Float32Array, noise: Float32Array): number {
  const signalRMS = calculateRMS(signal);
  const noiseRMS = calculateRMS(noise);

  if (noiseRMS === 0) return Infinity;
  return 20 * Math.log10(signalRMS / noiseRMS);
}

/**
 * Detect clipping in audio
 */
export function detectClipping(buffer: Float32Array, threshold = 0.99): number {
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
export function splitIntoChunks(
  buffer: Buffer | Uint8Array,
  chunkSize: number,
  overlap: number = 0
): Array<Buffer | Uint8Array> {
  const chunks: Array<Buffer | Uint8Array> = [];
  const stride = chunkSize - overlap;

  for (let i = 0; i < buffer.length; i += stride) {
    const end = Math.min(i + chunkSize, buffer.length);
    const chunk = buffer.slice(i, end);
    chunks.push(chunk);

    if (end === buffer.length) break;
  }

  return chunks;
}

/**
 * Merge audio chunks
 */
export function mergeChunks(chunks: Array<Buffer | Uint8Array>): Buffer {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = Buffer.allocUnsafe(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    if (Buffer.isBuffer(chunk)) {
      chunk.copy(merged, offset);
    } else {
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
export function resampleLinear(
  input: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index + 1 < input.length) {
      output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
    } else {
      output[i] = input[index];
    }
  }

  return output;
}

/**
 * Convert stereo to mono
 */
export function stereoToMono(left: Float32Array, right: Float32Array): Float32Array {
  const mono = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }
  return mono;
}

/**
 * Convert mono to stereo
 */
export function monoToStereo(mono: Float32Array): { left: Float32Array; right: Float32Array } {
  return {
    left: new Float32Array(mono),
    right: new Float32Array(mono)
  };
}

/**
 * Apply fade in/out
 */
export function applyFade(
  buffer: Float32Array,
  fadeInSamples: number,
  fadeOutSamples: number
): Float32Array {
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
export function getSupportedFormats(): AudioFormat[] {
  return Object.values(AudioFormat);
}

/**
 * Get standard sample rates
 */
export function getStandardSampleRates(): number[] {
  return Object.values(SampleRate).filter((v): v is number => typeof v === 'number');
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Create checksum of audio data
 */
export async function createChecksum(data: Buffer | Uint8Array, algorithm: 'md5' | 'sha256' = 'sha256'): Promise<string> {
  const crypto = await import('crypto');
  const hash = crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Verify audio checksum
 */
export async function verifyChecksum(
  data: Buffer | Uint8Array,
  expectedChecksum: string,
  algorithm: 'md5' | 'sha256' = 'sha256'
): Promise<boolean> {
  const actualChecksum = await createChecksum(data, algorithm);
  return actualChecksum === expectedChecksum;
}
