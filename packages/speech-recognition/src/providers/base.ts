import type { AudioBuffer } from '@intelgraph/audio-processing';
import type { ISTTProvider } from '../interfaces.js';
import type { STTConfig, TranscriptionResult, STTProvider } from '../types.js';
import { SUPPORTED_LANGUAGES } from '../types.js';

/**
 * Base class for STT providers
 */
export abstract class BaseSTTProvider implements ISTTProvider {
  protected config: Partial<STTConfig>;

  constructor(config: Partial<STTConfig> = {}) {
    this.config = config;
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

  /**
   * Merge configurations
   */
  protected mergeConfig(config: STTConfig): STTConfig {
    return {
      ...this.config,
      ...config
    } as STTConfig;
  }
}

/**
 * Factory for creating STT providers
 */
export class STTProviderFactory {
  private static providers = new Map<STTProvider, () => ISTTProvider>();

  /**
   * Register a provider
   */
  static register(type: STTProvider, factory: () => ISTTProvider): void {
    this.providers.set(type, factory);
  }

  /**
   * Create provider instance
   */
  static create(type: STTProvider, config?: Partial<STTConfig>): ISTTProvider {
    const factory = this.providers.get(type);
    if (!factory) {
      throw new Error(`Provider ${type} not registered`);
    }
    return factory();
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): STTProvider[] {
    return Array.from(this.providers.keys());
  }
}
