import type { AudioBuffer } from '@intelgraph/audio-processing';
import { BaseSTTProvider } from './base.js';
import type { STTConfig, TranscriptionResult, WhisperModel } from '../types.js';
import { STTProvider, SUPPORTED_LANGUAGES } from '../types.js';
import axios from 'axios';

/**
 * Whisper STT Provider
 * Supports OpenAI Whisper models for high-accuracy transcription
 */
export class WhisperProvider extends BaseSTTProvider {
  private apiKey?: string;
  private endpoint: string;
  private model: WhisperModel;

  constructor(config: { apiKey?: string; endpoint?: string; model?: WhisperModel } = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.endpoint = config.endpoint || 'https://api.openai.com/v1/audio/transcriptions';
    this.model = config.model || 'large-v3' as WhisperModel;
  }

  getName(): string {
    return 'Whisper';
  }

  async transcribe(audio: AudioBuffer, config: STTConfig): Promise<TranscriptionResult> {
    this.validateConfig(config);
    const mergedConfig = this.mergeConfig(config);

    try {
      // Prepare form data
      const formData = new FormData();
      const blob = new Blob([audio.data], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', this.model);
      formData.append('language', mergedConfig.language.split('-')[0]); // Whisper uses 2-letter codes
      formData.append('response_format', 'verbose_json');

      if (mergedConfig.enableWordTimestamps) {
        formData.append('timestamp_granularities', 'word');
      }

      if (mergedConfig.temperature !== undefined) {
        formData.append('temperature', String(mergedConfig.temperature));
      }

      // Make API request
      const response = await axios.post(this.endpoint, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Transform Whisper response to our format
      return this.transformWhisperResponse(response.data, mergedConfig);
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error}`);
    }
  }

  protected getProviderLanguages(): string[] {
    // Whisper supports 100+ languages
    return Array.from(SUPPORTED_LANGUAGES);
  }

  getMaxDuration(): number {
    // Whisper API has a 25MB file size limit
    return 3600; // ~1 hour of audio
  }

  private transformWhisperResponse(response: any, config: STTConfig): TranscriptionResult {
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
      duration: response.duration,
      provider: STTProvider.WHISPER,
      model: this.model,
      metadata: {
        task: response.task,
        temperature: response.temperature
      }
    };
  }
}
