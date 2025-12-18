/**
 * Provider Registry
 *
 * Manages registration and selection of STT, diarization, and other providers.
 * Supports pluggable provider architecture with fallback mechanisms.
 */

import type {
  STTProvider,
  DiarizationProvider,
  LanguageDetectionProvider,
  TranslationProvider,
  ContentAnalysisProvider,
  ProviderConfig,
  ProviderHealth,
  ProviderSelection,
  ProviderSelector,
} from '../types/providers.js';
import type { MediaAsset } from '../types/media.js';
import { MockSTTProvider } from './stt/mock-stt-provider.js';
import { MockDiarizationProvider } from './diarization/mock-diarization-provider.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';

class ProviderRegistry implements ProviderSelector {
  private sttProviders: Map<string, STTProvider> = new Map();
  private diarizationProviders: Map<string, DiarizationProvider> = new Map();
  private languageDetectionProviders: Map<string, LanguageDetectionProvider> = new Map();
  private translationProviders: Map<string, TranslationProvider> = new Map();
  private contentAnalysisProviders: Map<string, ContentAnalysisProvider> = new Map();

  private initialized = false;

  /**
   * Initialize the registry with default providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing provider registry');

    // Register mock STT provider
    const mockSTT = new MockSTTProvider();
    await mockSTT.initialize({
      id: 'mock-stt',
      name: 'Mock STT Provider',
      type: 'stt',
      version: '1.0.0',
      enabled: true,
      priority: 0,
    });
    this.registerSTTProvider(mockSTT);

    // Register mock diarization provider
    const mockDiarization = new MockDiarizationProvider();
    await mockDiarization.initialize({
      id: 'mock-diarization',
      name: 'Mock Diarization Provider',
      type: 'diarization',
      version: '1.0.0',
      enabled: true,
      priority: 0,
    });
    this.registerDiarizationProvider(mockDiarization);

    this.initialized = true;
    logger.info(
      {
        sttProviders: Array.from(this.sttProviders.keys()),
        diarizationProviders: Array.from(this.diarizationProviders.keys()),
      },
      'Provider registry initialized'
    );
  }

  // ============================================================================
  // Registration Methods
  // ============================================================================

  registerSTTProvider(provider: STTProvider): void {
    this.sttProviders.set(provider.id, provider);
    logger.info({ providerId: provider.id }, 'Registered STT provider');
  }

  registerDiarizationProvider(provider: DiarizationProvider): void {
    this.diarizationProviders.set(provider.id, provider);
    logger.info({ providerId: provider.id }, 'Registered diarization provider');
  }

  registerLanguageDetectionProvider(provider: LanguageDetectionProvider): void {
    this.languageDetectionProviders.set(provider.id, provider);
    logger.info({ providerId: provider.id }, 'Registered language detection provider');
  }

  registerTranslationProvider(provider: TranslationProvider): void {
    this.translationProviders.set(provider.id, provider);
    logger.info({ providerId: provider.id }, 'Registered translation provider');
  }

  registerContentAnalysisProvider(provider: ContentAnalysisProvider): void {
    this.contentAnalysisProviders.set(provider.id, provider);
    logger.info({ providerId: provider.id }, 'Registered content analysis provider');
  }

  // ============================================================================
  // Getter Methods
  // ============================================================================

  getSTTProvider(id: string): STTProvider | undefined {
    return this.sttProviders.get(id);
  }

  getDiarizationProvider(id: string): DiarizationProvider | undefined {
    return this.diarizationProviders.get(id);
  }

  getLanguageDetectionProvider(id: string): LanguageDetectionProvider | undefined {
    return this.languageDetectionProviders.get(id);
  }

  getTranslationProvider(id: string): TranslationProvider | undefined {
    return this.translationProviders.get(id);
  }

  getContentAnalysisProvider(id: string): ContentAnalysisProvider | undefined {
    return this.contentAnalysisProviders.get(id);
  }

  // ============================================================================
  // List Methods
  // ============================================================================

  listSTTProviders(): string[] {
    return Array.from(this.sttProviders.keys());
  }

  listDiarizationProviders(): string[] {
    return Array.from(this.diarizationProviders.keys());
  }

  // ============================================================================
  // Health Check Methods
  // ============================================================================

  async checkSTTProviderHealth(id: string): Promise<ProviderHealth | null> {
    const provider = this.sttProviders.get(id);
    if (!provider) return null;
    return provider.healthCheck();
  }

  async checkDiarizationProviderHealth(id: string): Promise<ProviderHealth | null> {
    const provider = this.diarizationProviders.get(id);
    if (!provider) return null;
    return provider.healthCheck();
  }

  async checkAllProvidersHealth(): Promise<Map<string, ProviderHealth>> {
    const results = new Map<string, ProviderHealth>();

    for (const [id, provider] of this.sttProviders) {
      try {
        results.set(`stt:${id}`, await provider.healthCheck());
      } catch (error) {
        results.set(`stt:${id}`, {
          providerId: id,
          status: 'unavailable',
          lastChecked: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    for (const [id, provider] of this.diarizationProviders) {
      try {
        results.set(`diarization:${id}`, await provider.healthCheck());
      } catch (error) {
        results.set(`diarization:${id}`, {
          providerId: id,
          status: 'unavailable',
          lastChecked: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Provider Selection (ProviderSelector interface)
  // ============================================================================

  async selectSTTProvider(
    mediaAsset: MediaAsset,
    preferences?: { language?: string; quality?: 'fast' | 'balanced' | 'accurate' }
  ): Promise<ProviderSelection> {
    const format = mediaAsset.format;
    const availableProviders: string[] = [];

    // Find providers that support the format
    for (const [id, provider] of this.sttProviders) {
      if (provider.supportedFormats.includes(format)) {
        const health = await provider.healthCheck();
        if (health.status === 'available' || health.status === 'degraded') {
          availableProviders.push(id);
        }
      }
    }

    if (availableProviders.length === 0) {
      throw new Error(`No STT providers available for format: ${format}`);
    }

    // Check if preferred provider is configured and available
    const defaultProvider = config.sttDefaultProvider;
    if (defaultProvider && availableProviders.includes(defaultProvider)) {
      return {
        providerId: defaultProvider,
        reason: 'Configured default provider',
        fallbacks: availableProviders.filter((id) => id !== defaultProvider),
      };
    }

    // Return first available provider
    return {
      providerId: availableProviders[0],
      reason: 'First available provider',
      fallbacks: availableProviders.slice(1),
    };
  }

  async selectDiarizationProvider(
    mediaAsset: MediaAsset,
    preferences?: { expectedSpeakers?: number }
  ): Promise<ProviderSelection> {
    const format = mediaAsset.format;
    const availableProviders: string[] = [];

    for (const [id, provider] of this.diarizationProviders) {
      if (provider.supportedFormats.includes(format)) {
        const health = await provider.healthCheck();
        if (health.status === 'available' || health.status === 'degraded') {
          availableProviders.push(id);
        }
      }
    }

    if (availableProviders.length === 0) {
      throw new Error(`No diarization providers available for format: ${format}`);
    }

    const defaultProvider = config.diarizationDefaultProvider;
    if (defaultProvider && availableProviders.includes(defaultProvider)) {
      return {
        providerId: defaultProvider,
        reason: 'Configured default provider',
        fallbacks: availableProviders.filter((id) => id !== defaultProvider),
      };
    }

    return {
      providerId: availableProviders[0],
      reason: 'First available provider',
      fallbacks: availableProviders.slice(1),
    };
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
export default providerRegistry;
