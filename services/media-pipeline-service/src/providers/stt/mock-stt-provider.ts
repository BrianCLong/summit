/**
 * Mock STT Provider
 *
 * A mock implementation of the STT provider for testing and development.
 * Generates synthetic transcription results.
 */

import { BaseProvider } from '../base.js';
import type {
  STTProvider,
  STTRequest,
  STTResult,
  STTSegment,
  ProviderConfig,
  ProviderHealth,
} from '../../types/providers.js';
import { generateId } from '../../utils/hash.js';
import { logger } from '../../utils/logger.js';

export class MockSTTProvider extends BaseProvider implements STTProvider {
  readonly id = 'mock-stt';
  readonly name = 'Mock STT Provider';
  readonly supportedFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'webm', 'mp4'];
  readonly supportedLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar'];
  readonly maxDurationMs = 4 * 60 * 60 * 1000; // 4 hours
  readonly maxFileSizeBytes = 500 * 1024 * 1024; // 500MB

  private processingDelayMs = 100;

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);
    if (config.options?.processingDelayMs) {
      this.processingDelayMs = config.options.processingDelayMs as number;
    }
    logger.info({ providerId: this.id }, 'Mock STT provider initialized');
  }

  async healthCheck(): Promise<ProviderHealth> {
    return this.createHealthResult('available', 10);
  }

  async transcribe(request: STTRequest): Promise<STTResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    const duration = request.mediaAsset.metadata?.duration || 60000;

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, this.processingDelayMs));

    // Generate mock segments
    const segments = this.generateMockSegments(duration, request.enableWordTimings);
    const fullText = segments.map((s) => s.text).join(' ');

    const processingTimeMs = Date.now() - startTime;

    logger.info(
      {
        providerId: this.id,
        mediaAssetId: request.mediaAsset.id,
        duration,
        segmentCount: segments.length,
        processingTimeMs,
      },
      'Mock transcription completed'
    );

    return {
      success: true,
      segments,
      fullText,
      language: request.language || 'en',
      languages: [request.language || 'en'],
      confidence: 0.92,
      duration,
      wordCount: fullText.split(/\s+/).length,
      provider: this.id,
      modelVersion: '1.0.0-mock',
      processingTimeMs,
    };
  }

  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  estimateCost(durationMs: number): number {
    // Mock: $0.006 per minute
    return (durationMs / 60000) * 0.006;
  }

  private generateMockSegments(duration: number, enableWordTimings?: boolean): STTSegment[] {
    const segments: STTSegment[] = [];
    const segmentDuration = 5000; // 5 seconds per segment
    const numSegments = Math.ceil(duration / segmentDuration);

    const mockPhrases = [
      'Hello, this is a test transcription.',
      'The meeting will begin shortly.',
      'Please review the documents I sent earlier.',
      'We need to discuss the project timeline.',
      'Can you confirm the budget allocation?',
      'I will follow up with the team tomorrow.',
      'Thank you for your time today.',
      'Let me share my screen with everyone.',
      'Are there any questions so far?',
      'The deadline is next Friday.',
    ];

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, duration);
      const text = mockPhrases[i % mockPhrases.length];
      const speakerLabel = `SPEAKER_0${(i % 3)}`;

      const segment: STTSegment = {
        text,
        startTime,
        endTime,
        confidence: 0.85 + Math.random() * 0.15,
        language: 'en',
        speakerLabel,
      };

      if (enableWordTimings) {
        segment.words = this.generateWordTimings(text, startTime, endTime);
      }

      segments.push(segment);
    }

    return segments;
  }

  private generateWordTimings(
    text: string,
    startTime: number,
    endTime: number
  ): Array<{ word: string; start: number; end: number; confidence?: number }> {
    const words = text.split(/\s+/);
    const totalDuration = endTime - startTime;
    const wordDuration = totalDuration / words.length;

    return words.map((word, index) => ({
      word,
      start: startTime + index * wordDuration,
      end: startTime + (index + 1) * wordDuration,
      confidence: 0.85 + Math.random() * 0.15,
    }));
  }
}
