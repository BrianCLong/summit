import type { AudioBuffer } from '@intelgraph/audio-processing';
import { BaseSTTProvider, ProviderConfig } from './base.js';
import type { STTConfig, TranscriptionResult } from '../types.js';
import { STTProvider, SUPPORTED_LANGUAGES } from '../types.js';

export interface AzureConfig extends ProviderConfig {
  subscriptionKey?: string;
  region?: string;
}

/**
 * Azure Speech Services Provider
 * Requires: microsoft-cognitiveservices-speech-sdk package
 */
export class AzureSTTProvider extends BaseSTTProvider {
  private subscriptionKey?: string;
  private region: string;

  constructor(config: AzureConfig = {}) {
    super(config);
    this.subscriptionKey = config.subscriptionKey || process.env.AZURE_SPEECH_KEY;
    this.region = config.region || process.env.AZURE_SPEECH_REGION || 'eastus';
  }

  getName(): string {
    return 'Azure Speech Services';
  }

  async transcribe(audio: AudioBuffer, config: STTConfig): Promise<TranscriptionResult> {
    this.validateConfig(config);

    try {
      // In production: use microsoft-cognitiveservices-speech-sdk
      return this.createPlaceholderResult(config, audio);
    } catch (error) {
      throw new Error(`Azure Speech Services failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected getProviderLanguages(): string[] {
    return Array.from(SUPPORTED_LANGUAGES);
  }

  getMaxDuration(): number {
    return 600;
  }

  private createPlaceholderResult(config: STTConfig, audio: AudioBuffer): TranscriptionResult {
    return {
      text: '',
      segments: [],
      language: config.language,
      languageConfidence: 1.0,
      duration: audio.metadata.duration,
      provider: STTProvider.AZURE,
      model: 'azure-speech'
    };
  }
}
