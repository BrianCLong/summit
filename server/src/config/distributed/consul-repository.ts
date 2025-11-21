import Consul from 'consul';
import { EventEmitter } from 'events';
import {
  AppliedState,
  AuditEntry,
  ConfigVersion,
  ConfigWatcher,
  EnvironmentName,
  RepositoryWriter,
} from './types';

export interface ConsulRepositoryConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  token?: string;
  prefix?: string;
}

/**
 * Consul-backed configuration repository
 * Provides real-time distributed configuration with automatic change propagation
 */
export class ConsulConfigRepository<TConfig = Record<string, any>>
  implements RepositoryWriter<TConfig>
{
  private readonly consul: Consul.Consul;
  private readonly prefix: string;
  private readonly events = new EventEmitter();
  private readonly watchers = new Map<string, Consul.Watch>();

  constructor(config: ConsulRepositoryConfig = {}) {
    this.consul = new Consul({
      host: config.host || 'localhost',
      port: config.port || 8500,
      secure: config.secure || false,
      promisify: true,
    } as any);

    this.prefix = config.prefix || 'summit/config';
  }

  async saveVersion(
    configId: string,
    version: ConfigVersion<TConfig>,
    auditEntry: AuditEntry,
  ): Promise<void> {
    const versionKey = `${this.prefix}/${configId}/versions/${version.metadata.version}`;
    const latestKey = `${this.prefix}/${configId}/latest`;
    const auditKey = `${this.prefix}/${configId}/audit/${version.metadata.version}`;

    // Store version
    await this.consul.kv.set(versionKey, JSON.stringify(version));

    // Update latest pointer
    await this.consul.kv.set(latestKey, JSON.stringify(version));

    // Store audit entry
    await this.consul.kv.set(auditKey, JSON.stringify(auditEntry));

    // Append to audit trail
    const auditTrailKey = `${this.prefix}/${configId}/audit_trail`;
    const existingTrail = await this.getKey<AuditEntry[]>(auditTrailKey);
    const trail = existingTrail || [];
    trail.push(auditEntry);

    // Keep only last 100 audit entries to prevent unbounded growth
    const trimmedTrail = trail.slice(-100);
    await this.consul.kv.set(auditTrailKey, JSON.stringify(trimmedTrail));
  }

  async getLatestVersion(
    configId: string,
  ): Promise<ConfigVersion<TConfig> | undefined> {
    const key = `${this.prefix}/${configId}/latest`;
    return await this.getKey<ConfigVersion<TConfig>>(key);
  }

  async getVersion(
    configId: string,
    versionNumber: number,
  ): Promise<ConfigVersion<TConfig> | undefined> {
    const key = `${this.prefix}/${configId}/versions/${versionNumber}`;
    return await this.getKey<ConfigVersion<TConfig>>(key);
  }

  async listVersions(configId: string): Promise<ConfigVersion<TConfig>[]> {
    const prefix = `${this.prefix}/${configId}/versions/`;
    const keys = await this.consul.kv.keys(prefix);

    if (!keys || keys.length === 0) {
      return [];
    }

    const versions = await Promise.all(
      keys.map(async (key) => {
        const version = await this.getKey<ConfigVersion<TConfig>>(key);
        return version;
      }),
    );

    return versions
      .filter((v): v is ConfigVersion<TConfig> => v !== undefined)
      .sort((a, b) => b.metadata.version - a.metadata.version);
  }

  async recordAppliedState(
    configId: string,
    state: AppliedState,
  ): Promise<void> {
    const key = `${this.prefix}/${configId}/applied/${state.environment}`;
    await this.consul.kv.set(key, JSON.stringify(state));
  }

  async getAppliedState(
    configId: string,
    environment: EnvironmentName,
  ): Promise<AppliedState | undefined> {
    const key = `${this.prefix}/${configId}/applied/${environment}`;
    const state = await this.getKey<AppliedState>(key);

    if (state && state.appliedAt) {
      return {
        ...state,
        appliedAt: new Date(state.appliedAt),
      };
    }

    return state;
  }

  async getAuditTrail(configId: string): Promise<AuditEntry[]> {
    const key = `${this.prefix}/${configId}/audit_trail`;
    const trail = await this.getKey<AuditEntry[]>(key);

    if (!trail) {
      return [];
    }

    return trail.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));
  }

  /**
   * Watch for configuration changes
   */
  watch(
    configId: string,
    callback: ConfigWatcher<TConfig>,
  ): () => void {
    const key = `${this.prefix}/${configId}/latest`;

    const watch = this.consul.watch({
      method: this.consul.kv.get,
      options: { key },
    } as any);

    watch.on('change', async (data: any) => {
      if (!data || !data.Value) {
        return;
      }

      try {
        const version = JSON.parse(data.Value) as ConfigVersion<TConfig>;
        // Restore Date objects
        version.metadata.createdAt = new Date(version.metadata.createdAt);
        if (version.abTest) {
          version.abTest.startAt = new Date(version.abTest.startAt);
          if (version.abTest.endAt) {
            version.abTest.endAt = new Date(version.abTest.endAt);
          }
        }
        if (version.canary) {
          version.canary.startAt = new Date(version.canary.startAt);
          if (version.canary.endAt) {
            version.canary.endAt = new Date(version.canary.endAt);
          }
        }

        await callback({ configId, version });
      } catch (error) {
        console.error('Error parsing Consul watch data:', error);
      }
    });

    watch.on('error', (error: Error) => {
      console.error(`Consul watch error for ${configId}:`, error);
    });

    this.watchers.set(configId, watch);

    // Return cleanup function
    return () => {
      watch.end();
      this.watchers.delete(configId);
    };
  }

  /**
   * Get all configuration IDs
   */
  async listConfigs(): Promise<string[]> {
    const prefix = `${this.prefix}/`;
    const keys = await this.consul.kv.keys(prefix);

    if (!keys || keys.length === 0) {
      return [];
    }

    // Extract unique config IDs from keys
    const configIds = new Set<string>();
    for (const key of keys) {
      const parts = key.replace(prefix, '').split('/');
      if (parts.length > 0) {
        configIds.add(parts[0]);
      }
    }

    return Array.from(configIds).sort();
  }

  /**
   * Delete a configuration and all its data
   */
  async deleteConfig(configId: string): Promise<void> {
    const prefix = `${this.prefix}/${configId}/`;

    // Stop watching if active
    const watch = this.watchers.get(configId);
    if (watch) {
      watch.end();
      this.watchers.delete(configId);
    }

    // Delete all keys under this config
    await this.consul.kv.del({ key: prefix, recurse: true } as any);
  }

  /**
   * Clean up old versions (not typically needed for Consul, but provided for consistency)
   */
  async cleanupOldVersions(
    configId: string,
    keepVersions: number = 10,
  ): Promise<number> {
    const versions = await this.listVersions(configId);

    if (versions.length <= keepVersions) {
      return 0;
    }

    const toDelete = versions.slice(keepVersions);
    let deleted = 0;

    for (const version of toDelete) {
      const key = `${this.prefix}/${configId}/versions/${version.metadata.version}`;
      const auditKey = `${this.prefix}/${configId}/audit/${version.metadata.version}`;

      try {
        await this.consul.kv.del(key);
        await this.consul.kv.del(auditKey);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete version ${version.metadata.version}:`, error);
      }
    }

    return deleted;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.consul.agent.check.list();
      return !!health;
    } catch (error) {
      return false;
    }
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(
    lockId: string,
    ttl: number = 30,
  ): Promise<string | null> {
    const sessionId = await this.consul.session.create({
      name: `config-lock-${lockId}`,
      ttl: `${ttl}s`,
      behavior: 'delete',
    } as any);

    const lockKey = `${this.prefix}/locks/${lockId}`;
    const acquired = await this.consul.kv.set({
      key: lockKey,
      value: sessionId,
      acquire: sessionId,
    } as any);

    return acquired ? sessionId : null;
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockId: string, sessionId: string): Promise<void> {
    const lockKey = `${this.prefix}/locks/${lockId}`;
    await this.consul.kv.set({
      key: lockKey,
      release: sessionId,
    } as any);
    await this.consul.session.destroy(sessionId);
  }

  /**
   * Close all connections and watchers
   */
  async close(): Promise<void> {
    // Stop all active watches
    for (const watch of this.watchers.values()) {
      watch.end();
    }
    this.watchers.clear();
  }

  /**
   * Helper method to get and parse a key
   */
  private async getKey<T>(key: string): Promise<T | undefined> {
    try {
      const result = await this.consul.kv.get(key);

      if (!result || !result.Value) {
        return undefined;
      }

      return JSON.parse(result.Value) as T;
    } catch (error) {
      // Key doesn't exist
      if ((error as any).statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }
}

export default ConsulConfigRepository;
