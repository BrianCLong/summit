import type { AudioBuffer } from '@intelgraph/audio-processing';
import { BaseSTTProvider, ProviderConfig } from './base.js';
import type { STTConfig, TranscriptionResult } from '../types.js';
import { STTProvider, SUPPORTED_LANGUAGES } from '../types.js';

export interface GoogleConfig extends ProviderConfig {
  projectId?: string;
  keyFilename?: string;
}

/**
 * Google Cloud Speech-to-Text Provider
 * Requires: @google-cloud/speech package
 */
export class GoogleSTTProvider extends BaseSTTProvider {
  private projectId?: string;

  constructor(config: GoogleConfig = {}) {
    super(config);
    this.projectId = config.projectId || process.env.GOOGLE_PROJECT_ID;
  }

  getName(): string {
    return 'Google Cloud Speech-to-Text';
  }

  async transcribe(audio: AudioBuffer, config: STTConfig): Promise<TranscriptionResult> {
    this.validateConfig(config);

    try {
      const audioData = audio.data instanceof Buffer
        ? audio.data
        : Buffer.from(audio.data);

      const request = {
        audio: { content: audioData.toString('base64') },
        config: {
          encoding: this.getGoogleEncoding(audio.metadata.codec),
          sampleRateHertz: audio.metadata.sampleRate,
          languageCode: config.language,
          enableAutomaticPunctuation: config.enableAutomaticPunctuation,
          enableWordTimeOffsets: config.enableWordTimestamps,
          enableSpeakerDiarization: config.enableSpeakerDiarization,
          profanityFilter: config.profanityFilter,
          model: config.model || 'latest_long'
        }
      };

      // In production: const [response] = await this.client.recognize(request);
      return this.createPlaceholderResult(config, audio);
    } catch (error) {
      throw new Error(`Google Speech-to-Text failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected getProviderLanguages(): string[] {
    return Array.from(SUPPORTED_LANGUAGES);
  }

  getMaxDuration(): number {
    return 28800;
  }

  private getGoogleEncoding(codec: string): string {
    const encodingMap: Record<string, string> = { pcm: 'LINEAR16', flac: 'FLAC', opus: 'OGG_OPUS', mp3: 'MP3' };
    return encodingMap[codec] || 'LINEAR16';
  }

  private createPlaceholderResult(config: STTConfig, audio: AudioBuffer): TranscriptionResult {
    return {
      text: '',
      segments: [],
      language: config.language,
      languageConfidence: 1.0,
      duration: audio.metadata.duration,
      provider: STTProvider.GOOGLE,
      model: config.model || 'latest_long'
    };
  }
}
