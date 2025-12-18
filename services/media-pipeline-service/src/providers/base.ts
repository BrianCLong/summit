/**
 * Base Provider Implementation
 *
 * Provides common functionality for all provider types.
 */

import type {
  ProviderConfig,
  ProviderHealth,
  ProviderStatus,
} from '../types/providers.js';
import { logger } from '../utils/logger.js';
import { now } from '../utils/time.js';

export abstract class BaseProvider {
  protected config: ProviderConfig | null = null;
  protected initialized = false;
  protected lastHealthCheck: ProviderHealth | null = null;

  abstract readonly id: string;
  abstract readonly name: string;

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    logger.info({ providerId: this.id, providerName: this.name }, 'Provider initialized');
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig | null {
    return this.config;
  }

  /**
   * Create a health check result
   */
  protected createHealthResult(
    status: ProviderStatus,
    latencyMs?: number,
    errorMessage?: string,
    remainingQuota?: number
  ): ProviderHealth {
    const health: ProviderHealth = {
      providerId: this.id,
      status,
      lastChecked: now(),
      latencyMs,
      errorMessage,
      remainingQuota,
    };
    this.lastHealthCheck = health;
    return health;
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): ProviderHealth | null {
    return this.lastHealthCheck;
  }

  /**
   * Ensure provider is ready for use
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Provider ${this.id} is not initialized`);
    }
  }
}
