import type { AudioBuffer } from '@intelgraph/audio-processing';
import { BaseSTTProvider, ProviderConfig } from './base.js';
import type { STTConfig, TranscriptionResult, WhisperModel } from '../types.js';
import { STTProvider, SUPPORTED_LANGUAGES } from '../types.js';
import axios from 'axios';

export interface WhisperConfig extends ProviderConfig {
  model?: WhisperModel;
}

/**
 * Whisper STT Provider
 * Supports OpenAI Whisper models for high-accuracy transcription
 */
export class WhisperProvider extends BaseSTTProvider {
  private apiKey?: string;
  private endpoint: string;
  private model: string;

  constructor(config: WhisperConfig = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.endpoint = config.endpoint || 'https://api.openai.com/v1/audio/transcriptions';
    this.model = config.model || 'whisper-1';
  }

  getName(): string {
    return 'Whisper';
  }

  async transcribe(audio: AudioBuffer, config: STTConfig): Promise<TranscriptionResult> {
    this.validateConfig(config);

    try {
      // Convert buffer to Uint8Array for Blob compatibility
      let uint8Array: Uint8Array;
      if (Buffer.isBuffer(audio.data)) {
        uint8Array = new Uint8Array(audio.data);
      } else {
        uint8Array = audio.data as Uint8Array;
      }

      // Prepare form data
      const formData = new FormData();
      const blob = new Blob([uint8Array as BlobPart], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', this.model);
      formData.append('language', config.language.split('-')[0]);
      formData.append('response_format', 'verbose_json');

      if (config.enableWordTimestamps) {
        formData.append('timestamp_granularities[]', 'word');
      }

      if (config.temperature !== undefined) {
        formData.append('temperature', String(config.temperature));
      }

      // Make API request
      const response = await axios.post(this.endpoint, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      return this.transformWhisperResponse(response.data, config, audio);
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected getProviderLanguages(): string[] {
    return Array.from(SUPPORTED_LANGUAGES);
  }

  getMaxDuration(): number {
    return 3600;
  }

  private transformWhisperResponse(response: any, config: STTConfig, audio: AudioBuffer): TranscriptionResult {
    const segments = (response.segments || []).map((seg: any) => ({
      text: seg.text,
      startTime: seg.start,
      endTime: seg.end,
      confidence: seg.confidence || 1.0,
      words: seg.words?.map((word: any) => ({
        word: word.word,
        startTime: word.start,
        endTime: word.end,
        confidence: word.probability || 1.0
      }))
    }));

    return {
      text: response.text,
      segments,
      language: response.language || config.language,
      languageConfidence: 1.0,
      duration: response.duration || audio.metadata.duration,
      provider: STTProvider.WHISPER,
      model: this.model,
      metadata: {
        task: response.task,
        temperature: response.temperature
      }
    };
  }
}
