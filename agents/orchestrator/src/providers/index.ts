/**
 * Provider Factory and Registry
 *
 * Central registry for LLM providers with factory methods
 * for creating provider instances.
 */

import { BaseLLMProvider } from './BaseLLMProvider.js';
import { ClaudeProvider, ClaudeProviderConfig } from './ClaudeProvider.js';
import { OpenAIProvider, OpenAIProviderConfig } from './OpenAIProvider.js';
import { LLMProvider, LLMModel, LLMProviderConfig } from '../types/index.js';

export { BaseLLMProvider } from './BaseLLMProvider.js';
export { ClaudeProvider, ClaudeProviderConfig } from './ClaudeProvider.js';
export { OpenAIProvider, OpenAIProviderConfig } from './OpenAIProvider.js';

/**
 * Provider Registry - manages provider instances
 */
export class ProviderRegistry {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private defaultProvider?: string;

  /**
   * Register a provider instance
   */
  register(key: string, provider: BaseLLMProvider, isDefault: boolean = false): void {
    this.providers.set(key, provider);
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = key;
    }
  }

  /**
   * Get a provider by key
   */
  get(key: string): BaseLLMProvider | undefined {
    return this.providers.get(key);
  }

  /**
   * Get the default provider
   */
  getDefault(): BaseLLMProvider | undefined {
    return this.defaultProvider ? this.providers.get(this.defaultProvider) : undefined;
  }

  /**
   * Get provider by model
   */
  getByModel(model: LLMModel): BaseLLMProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.supportedModels.includes(model)) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * Get all registered providers
   */
  getAll(): Map<string, BaseLLMProvider> {
    return new Map(this.providers);
  }

  /**
   * Remove a provider
   */
  remove(key: string): boolean {
    return this.providers.delete(key);
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.defaultProvider = undefined;
  }

  /**
   * Check if a provider exists
   */
  has(key: string): boolean {
    return this.providers.has(key);
  }

  /**
   * Get provider count
   */
  get size(): number {
    return this.providers.size;
  }
}

/**
 * Provider Factory - creates provider instances from config
 */
export class ProviderFactory {
  /**
   * Create a provider from configuration
   */
  static create(config: LLMProviderConfig): BaseLLMProvider {
    switch (config.provider) {
      case 'claude':
        return new ClaudeProvider(config as ClaudeProviderConfig);
      case 'gpt':
      case 'o1':
        return new OpenAIProvider(config as OpenAIProviderConfig);
      case 'local':
        throw new Error('Local provider not yet implemented');
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * Create default provider configurations
   */
  static createDefaultConfigs(): LLMProviderConfig[] {
    return [
      {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 60000,
        retries: 3,
      },
      {
        provider: 'gpt',
        model: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 60000,
        retries: 3,
      },
      {
        provider: 'o1',
        model: 'o1-preview',
        maxTokens: 32768,
        temperature: 1, // o1 doesn't support temperature
        timeout: 120000, // o1 needs longer timeout
        retries: 2,
      },
    ];
  }

  /**
   * Create a registry with default providers
   */
  static createDefaultRegistry(): ProviderRegistry {
    const registry = new ProviderRegistry();
    const configs = this.createDefaultConfigs();

    for (const config of configs) {
      try {
        const provider = this.create(config);
        registry.register(`${config.provider}-${config.model}`, provider, config.provider === 'claude');
      } catch {
        // Skip providers that fail to initialize
      }
    }

    return registry;
  }
}

/**
 * Model capabilities and metadata
 */
export const MODEL_CAPABILITIES: Record<LLMModel, {
  provider: LLMProvider;
  maxContextTokens: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  strengths: string[];
}> = {
  'claude-3-5-sonnet-20241022': {
    provider: 'claude',
    maxContextTokens: 200000,
    maxOutputTokens: 8192,
    supportsTools: true,
    supportsStreaming: true,
    supportsVision: true,
    strengths: ['coding', 'analysis', 'reasoning', 'creativity', 'safety'],
  },
  'claude-3-opus-20240229': {
    provider: 'claude',
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsStreaming: true,
    supportsVision: true,
    strengths: ['complex-reasoning', 'nuanced-analysis', 'writing'],
  },
  'claude-3-haiku-20240307': {
    provider: 'claude',
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsStreaming: true,
    supportsVision: true,
    strengths: ['speed', 'cost-efficiency', 'simple-tasks'],
  },
  'gpt-4-turbo': {
    provider: 'gpt',
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsStreaming: true,
    supportsVision: true,
    strengths: ['general-purpose', 'coding', 'analysis'],
  },
  'gpt-4o': {
    provider: 'gpt',
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    supportsTools: true,
    supportsStreaming: true,
    supportsVision: true,
    strengths: ['multimodal', 'speed', 'general-purpose'],
  },
  'gpt-4o-mini': {
    provider: 'gpt',
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    supportsTools: true,
    supportsStreaming: true,
    supportsVision: true,
    strengths: ['cost-efficiency', 'speed', 'simple-tasks'],
  },
  'o1-preview': {
    provider: 'o1',
    maxContextTokens: 128000,
    maxOutputTokens: 32768,
    supportsTools: false,
    supportsStreaming: false,
    supportsVision: false,
    strengths: ['deep-reasoning', 'math', 'science', 'complex-problems'],
  },
  'o1-mini': {
    provider: 'o1',
    maxContextTokens: 128000,
    maxOutputTokens: 65536,
    supportsTools: false,
    supportsStreaming: false,
    supportsVision: false,
    strengths: ['reasoning', 'coding', 'cost-efficiency'],
  },
  'local-llama': {
    provider: 'local',
    maxContextTokens: 4096,
    maxOutputTokens: 2048,
    supportsTools: false,
    supportsStreaming: true,
    supportsVision: false,
    strengths: ['privacy', 'offline', 'cost-free'],
  },
};
