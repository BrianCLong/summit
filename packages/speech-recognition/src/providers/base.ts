import type { AudioBuffer } from '@intelgraph/audio-processing';
import type { ISTTProvider } from '../interfaces.js';
import type { STTConfig, TranscriptionResult } from '../types.js';
import { STTProvider, SUPPORTED_LANGUAGES } from '../types.js';

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  region?: string;
  endpoint?: string;
  projectId?: string;
  keyFilename?: string;
  subscriptionKey?: string;
  bucketName?: string;
  [key: string]: unknown;
}

/**
 * Base class for STT providers
 */
export abstract class BaseSTTProvider implements ISTTProvider {
  protected providerConfig: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.providerConfig = config;
  }

  abstract getName(): string;
  abstract transcribe(audio: AudioBuffer, config: STTConfig): Promise<TranscriptionResult>;

  /**
   * Get provider-specific supported languages
   */
  protected abstract getProviderLanguages(): string[];

  /**
   * Check if language is supported
   */
  supportsLanguage(language: string): boolean {
    const supported = this.getProviderLanguages();
    return supported.includes(language);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.getProviderLanguages();
  }

  /**
   * Get maximum audio duration (default 10 hours)
   */
  getMaxDuration(): number {
    return 36000;
  }

  /**
   * Validate configuration
   */
  protected validateConfig(config: STTConfig): void {
    if (!this.supportsLanguage(config.language)) {
      throw new Error(`Language ${config.language} not supported by ${this.getName()}`);
    }
  }
}

/**
 * Factory for creating STT providers
 */
export class STTProviderFactory {
  private static providers = new Map<STTProvider, (config?: ProviderConfig) => ISTTProvider>();

  /**
   * Register a provider
   */
  static register(type: STTProvider, factory: (config?: ProviderConfig) => ISTTProvider): void {
    this.providers.set(type, factory);
  }

  /**
   * Create provider instance
   */
  static create(type: STTProvider, config?: ProviderConfig): ISTTProvider {
    const factory = this.providers.get(type);
    if (!factory) {
      throw new Error(`Provider ${type} not registered`);
    }
    return factory(config);
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): STTProvider[] {
    return Array.from(this.providers.keys());
  }
}
