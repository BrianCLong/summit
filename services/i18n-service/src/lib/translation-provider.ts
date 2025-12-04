import type {
  LanguageCode,
  TranslationResult,
  TranslationServiceConfig,
} from '../types/index.js';

/**
 * Abstract translation provider interface
 */
export interface TranslationProvider {
  name: string;
  translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string>;
  translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string[]>;
  isAvailable(): Promise<boolean>;
}

/**
 * Mock translation provider for testing/development
 */
export class MockTranslationProvider implements TranslationProvider {
  name = 'mock';

  async translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string> {
    // Return text with prefix indicating it's been "translated"
    return `[${sourceLanguage}→${targetLanguage}] ${text}`;
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string[]> {
    return Promise.all(
      texts.map((text) => this.translate(text, sourceLanguage, targetLanguage))
    );
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * Google Cloud Translation provider
 */
export class GoogleTranslationProvider implements TranslationProvider {
  name = 'google';
  private client: any; // @google-cloud/translate client
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Google Translation API key not configured');
    }

    try {
      const { v2 } = await import('@google-cloud/translate');
      this.client = new v2.Translate({ key: this.apiKey });
    } catch (error) {
      console.error('Failed to initialize Google Translation:', error);
      throw error;
    }
  }

  async translate(
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const [translation] = await this.client.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
        format: 'text',
      });

      return translation;
    } catch (error) {
      console.error('Google Translation error:', error);
      throw error;
    }
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<string[]> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const [translations] = await this.client.translate(texts, {
        from: sourceLanguage,
        to: targetLanguage,
        format: 'text',
      });

      return Array.isArray(translations) ? translations : [translations];
    } catch (error) {
      console.error('Google Translation batch error:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}

/**
 * Local/passthrough provider (no translation, returns original text)
 */
export class LocalTranslationProvider implements TranslationProvider {
  name = 'local';

  async translate(
    text: string,
    _sourceLanguage: LanguageCode,
    _targetLanguage: LanguageCode
  ): Promise<string> {
    return text;
  }

  async translateBatch(
    texts: string[],
    _sourceLanguage: LanguageCode,
    _targetLanguage: LanguageCode
  ): Promise<string[]> {
    return texts;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * Translation provider factory
 */
export class TranslationProviderFactory {
  private static providers = new Map<string, TranslationProvider>();

  static registerProvider(provider: TranslationProvider): void {
    this.providers.set(provider.name, provider);
  }

  static getProvider(name: string): TranslationProvider | undefined {
    return this.providers.get(name);
  }

  static async createProvider(
    config: TranslationServiceConfig
  ): Promise<TranslationProvider> {
    const { defaultProvider, googleApiKey } = config;

    switch (defaultProvider) {
      case 'google':
        if (!googleApiKey) {
          console.warn(
            'Google Translation API key not configured, falling back to mock'
          );
          return new MockTranslationProvider();
        }
        const googleProvider = new GoogleTranslationProvider(googleApiKey);
        await googleProvider.initialize();
        return googleProvider;

      case 'local':
        return new LocalTranslationProvider();

      case 'mock':
      default:
        return new MockTranslationProvider();
    }
  }
}

// Register default providers
TranslationProviderFactory.registerProvider(new MockTranslationProvider());
TranslationProviderFactory.registerProvider(new LocalTranslationProvider());
