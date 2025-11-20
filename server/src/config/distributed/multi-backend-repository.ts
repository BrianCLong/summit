import { EventEmitter } from 'events';
import {
  AppliedState,
  AuditEntry,
  ConfigVersion,
  ConfigWatcher,
  EnvironmentName,
  RepositoryWriter,
} from './types';

export interface BackendHealth {
  name: string;
  healthy: boolean;
  lastCheck: Date;
  error?: Error;
}

export interface MultiBackendConfig {
  primary: RepositoryWriter;
  fallback?: RepositoryWriter;
  cache?: RepositoryWriter;
  healthCheckInterval?: number; // milliseconds
  failoverOnError?: boolean;
}

/**
 * Multi-backend repository with automatic failover
 *
 * Architecture:
 * - Primary: Consul (real-time, distributed)
 * - Fallback: PostgreSQL (persistent, reliable)
 * - Cache: In-Memory (fast, local)
 *
 * Write Strategy: Write-through (all backends)
 * Read Strategy: Cache → Primary → Fallback
 * Failover: Automatic on health check failure
 */
export class MultiBackendRepository<TConfig = Record<string, any>>
  implements RepositoryWriter<TConfig>
{
  private readonly primary: RepositoryWriter<TConfig>;
  private readonly fallback?: RepositoryWriter<TConfig>;
  private readonly cache?: RepositoryWriter<TConfig>;
  private readonly events = new EventEmitter();
  private readonly healthCheckInterval: number;
  private readonly failoverOnError: boolean;

  private healthStatus = new Map<string, BackendHealth>();
  private healthCheckTimer?: NodeJS.Timeout;
  private activePrimary: 'primary' | 'fallback' = 'primary';

  constructor(config: MultiBackendConfig) {
    this.primary = config.primary;
    this.fallback = config.fallback;
    this.cache = config.cache;
    this.healthCheckInterval = config.healthCheckInterval || 30000;
    this.failoverOnError = config.failoverOnError !== false;

    // Start health monitoring
    this.startHealthChecks();
  }

  async saveVersion(
    configId: string,
    version: ConfigVersion<TConfig>,
    auditEntry: AuditEntry,
  ): Promise<void> {
    const errors: Error[] = [];

    // Write to all backends in parallel
    const writes = [];

    // Primary/Fallback (depending on active)
    writes.push(
      this.executeWithFailover(
        'saveVersion',
        async (repo) => await repo.saveVersion(configId, version, auditEntry),
      ).catch((error) => {
        errors.push(error);
      }),
    );

    // Cache (best-effort)
    if (this.cache) {
      writes.push(
        this.cache.saveVersion(configId, version, auditEntry).catch((error) => {
          console.warn('Cache write failed:', error);
        }),
      );
    }

    await Promise.all(writes);

    // If all backends failed, throw error
    if (errors.length > 0 && (!this.cache || errors.length > 1)) {
      throw errors[0];
    }

    this.events.emit('version:saved', { configId, version });
  }

  async getLatestVersion(
    configId: string,
  ): Promise<ConfigVersion<TConfig> | undefined> {
    // Try cache first
    if (this.cache) {
      try {
        const cached = await this.cache.getLatestVersion(configId);
        if (cached) {
          return cached;
        }
      } catch (error) {
        console.warn('Cache read failed:', error);
      }
    }

    // Try primary/fallback
    const result = await this.executeWithFailover(
      'getLatestVersion',
      async (repo) => await repo.getLatestVersion(configId),
    );

    // Update cache if we got a result
    if (result && this.cache) {
      this.cache
        .saveVersion(
          configId,
          result,
          {
            version: result.metadata.version,
            actor: 'system',
            timestamp: new Date(),
            message: 'Cache sync',
          },
        )
        .catch((error) => {
          console.warn('Cache update failed:', error);
        });
    }

    return result;
  }

  async getVersion(
    configId: string,
    versionNumber: number,
  ): Promise<ConfigVersion<TConfig> | undefined> {
    // Try cache first
    if (this.cache) {
      try {
        const cached = await this.cache.getVersion(configId, versionNumber);
        if (cached) {
          return cached;
        }
      } catch (error) {
        console.warn('Cache read failed:', error);
      }
    }

    // Try primary/fallback
    return await this.executeWithFailover(
      'getVersion',
      async (repo) => await repo.getVersion(configId, versionNumber),
    );
  }

  async listVersions(configId: string): Promise<ConfigVersion<TConfig>[]> {
    return await this.executeWithFailover(
      'listVersions',
      async (repo) => await repo.listVersions(configId),
    );
  }

  async recordAppliedState(
    configId: string,
    state: AppliedState,
  ): Promise<void> {
    await this.executeWithFailover(
      'recordAppliedState',
      async (repo) => await repo.recordAppliedState(configId, state),
    );
  }

  async getAppliedState(
    configId: string,
    environment: EnvironmentName,
  ): Promise<AppliedState | undefined> {
    return await this.executeWithFailover(
      'getAppliedState',
      async (repo) => await repo.getAppliedState(configId, environment),
    );
  }

  async getAuditTrail(configId: string): Promise<AuditEntry[]> {
    return await this.executeWithFailover(
      'getAuditTrail',
      async (repo) => await repo.getAuditTrail(configId),
    );
  }

  /**
   * Get health status of all backends
   */
  getHealthStatus(): BackendHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get currently active primary backend
   */
  getActivePrimary(): 'primary' | 'fallback' {
    return this.activePrimary;
  }

  /**
   * Force failover to fallback backend
   */
  async failoverToFallback(): Promise<void> {
    if (!this.fallback) {
      throw new Error('No fallback backend configured');
    }

    console.warn('Forcing failover to fallback backend');
    this.activePrimary = 'fallback';
    this.events.emit('failover', { from: 'primary', to: 'fallback' });
  }

  /**
   * Restore primary backend
   */
  async restorePrimary(): Promise<void> {
    console.info('Restoring primary backend');
    this.activePrimary = 'primary';
    this.events.emit('restore', { from: 'fallback', to: 'primary' });
  }

  /**
   * Manual health check
   */
  async checkHealth(): Promise<Map<string, BackendHealth>> {
    const checks = [];

    // Check primary
    checks.push(
      this.checkBackendHealth('primary', this.primary),
    );

    // Check fallback
    if (this.fallback) {
      checks.push(
        this.checkBackendHealth('fallback', this.fallback),
      );
    }

    // Check cache
    if (this.cache) {
      checks.push(
        this.checkBackendHealth('cache', this.cache),
      );
    }

    await Promise.all(checks);
    return this.healthStatus;
  }

  /**
   * Stop health checks and cleanup
   */
  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const closes = [];

    if ('close' in this.primary && typeof this.primary.close === 'function') {
      closes.push(this.primary.close());
    }

    if (this.fallback && 'close' in this.fallback && typeof this.fallback.close === 'function') {
      closes.push(this.fallback.close());
    }

    if (this.cache && 'close' in this.cache && typeof this.cache.close === 'function') {
      closes.push(this.cache.close());
    }

    await Promise.all(closes);
  }

  /**
   * Listen for events
   */
  on(
    event: 'failover' | 'restore' | 'version:saved' | 'health:changed',
    listener: (...args: any[]) => void,
  ): void {
    this.events.on(event, listener);
  }

  /**
   * Execute operation with automatic failover
   */
  private async executeWithFailover<T>(
    operation: string,
    fn: (repo: RepositoryWriter<TConfig>) => Promise<T>,
  ): Promise<T> {
    const activeRepo = this.activePrimary === 'primary' ? this.primary : this.fallback;

    if (!activeRepo) {
      throw new Error('No active backend available');
    }

    try {
      return await fn(activeRepo);
    } catch (error) {
      console.error(`${operation} failed on ${this.activePrimary}:`, error);

      // Try failover if enabled and fallback exists
      if (
        this.failoverOnError &&
        this.fallback &&
        this.activePrimary === 'primary'
      ) {
        console.warn(`Attempting failover for ${operation}`);

        try {
          await this.failoverToFallback();
          return await fn(this.fallback);
        } catch (fallbackError) {
          console.error(`${operation} also failed on fallback:`, fallbackError);
          throw error; // Throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Initial check
    this.checkHealth().catch((error) => {
      console.error('Initial health check failed:', error);
    });

    // Periodic checks
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.checkHealth();

        // Auto-restore primary if it's healthy and we're on fallback
        if (this.activePrimary === 'fallback') {
          const primaryHealth = this.healthStatus.get('primary');
          if (primaryHealth?.healthy) {
            await this.restorePrimary();
          }
        }

        // Auto-failover if primary is unhealthy
        if (
          this.activePrimary === 'primary' &&
          this.fallback &&
          this.failoverOnError
        ) {
          const primaryHealth = this.healthStatus.get('primary');
          const fallbackHealth = this.healthStatus.get('fallback');

          if (!primaryHealth?.healthy && fallbackHealth?.healthy) {
            await this.failoverToFallback();
          }
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Check health of a specific backend
   */
  private async checkBackendHealth(
    name: string,
    backend: RepositoryWriter<TConfig>,
  ): Promise<void> {
    try {
      let healthy = true;

      // Try calling healthCheck if available
      if ('healthCheck' in backend && typeof backend.healthCheck === 'function') {
        healthy = await (backend as any).healthCheck();
      }

      const health: BackendHealth = {
        name,
        healthy,
        lastCheck: new Date(),
      };

      const previousHealth = this.healthStatus.get(name);
      this.healthStatus.set(name, health);

      // Emit event if health changed
      if (!previousHealth || previousHealth.healthy !== healthy) {
        this.events.emit('health:changed', health);
      }
    } catch (error) {
      const health: BackendHealth = {
        name,
        healthy: false,
        lastCheck: new Date(),
        error: error as Error,
      };

      const previousHealth = this.healthStatus.get(name);
      this.healthStatus.set(name, health);

      if (!previousHealth || previousHealth.healthy) {
        this.events.emit('health:changed', health);
      }
    }
  }
}

export default MultiBackendRepository;
