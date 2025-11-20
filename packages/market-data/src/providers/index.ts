export * from './base';
export * from './alpha-vantage';
export * from './polygon';

/**
 * Provider registry for managing multiple data providers
 */
import { IMarketDataProvider, ProviderConfig } from './base';
import { AlphaVantageProvider } from './alpha-vantage';
import { PolygonProvider } from './polygon';

export type ProviderType = 'alpha-vantage' | 'polygon' | 'iex' | 'yahoo' | 'custom';

export class ProviderRegistry {
  private providers = new Map<string, IMarketDataProvider>();
  private defaultProvider?: string;

  /**
   * Register a market data provider
   */
  registerProvider(name: string, provider: IMarketDataProvider): void {
    this.providers.set(name, provider);

    if (!this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  /**
   * Create and register a provider by type
   */
  async createProvider(type: ProviderType, config: ProviderConfig, name?: string): Promise<string> {
    let provider: IMarketDataProvider;

    switch (type) {
      case 'alpha-vantage':
        provider = new AlphaVantageProvider(config);
        break;
      case 'polygon':
        provider = new PolygonProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }

    await provider.connect();

    const providerName = name || type;
    this.registerProvider(providerName, provider);

    return providerName;
  }

  /**
   * Get a registered provider by name
   */
  getProvider(name?: string): IMarketDataProvider | undefined {
    if (!name && this.defaultProvider) {
      return this.providers.get(this.defaultProvider);
    }
    return name ? this.providers.get(name) : undefined;
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} is not registered`);
    }
    this.defaultProvider = name;
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Disconnect all providers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.providers.values()).map(
      provider => provider.disconnect()
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Remove a provider from the registry
   */
  async removeProvider(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (provider) {
      await provider.disconnect();
      this.providers.delete(name);

      if (this.defaultProvider === name) {
        this.defaultProvider = this.providers.keys().next().value;
      }
    }
  }
}

/**
 * Global provider registry instance
 */
export const globalProviderRegistry = new ProviderRegistry();
