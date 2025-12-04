import neo4j, { Driver } from 'neo4j-driver';
import { ShardConfig, ShardId } from './types.js';
import pino from 'pino';

const logger = pino({ name: 'ShardManager' });

export class ShardManager {
  private static instance: ShardManager;
  private drivers: Map<ShardId, Driver> = new Map();
  private configs: Map<ShardId, ShardConfig> = new Map();

  private constructor() {}

  public static getInstance(): ShardManager {
    if (!ShardManager.instance) {
      ShardManager.instance = new ShardManager();
    }
    return ShardManager.instance;
  }

  public async registerShard(config: ShardConfig): Promise<void> {
    if (this.drivers.has(config.id)) {
      logger.warn(`Shard ${config.id} already registered. Skipping.`);
      return;
    }

    try {
      const driver = neo4j.driver(
        config.uri,
        config.username && config.password
          ? neo4j.auth.basic(config.username, config.password)
          : undefined
      );

      // Basic connectivity check
      await driver.verifyConnectivity();

      this.drivers.set(config.id, driver);
      this.configs.set(config.id, config);
      logger.info(`Shard ${config.id} registered and connected.`);
    } catch (error) {
      logger.error(`Failed to connect to shard ${config.id}:`, error);
      // We might still register the config but mark it as down, or retry.
      // For now, fail hard or soft? Let's soft fail.
    }
  }

  public getDriver(shardId: ShardId): Driver | undefined {
    return this.drivers.get(shardId);
  }

  public getAllShards(): ShardId[] {
    return Array.from(this.drivers.keys());
  }

  public getShardConfig(shardId: ShardId): ShardConfig | undefined {
    return this.configs.get(shardId);
  }

  public async closeAll(): Promise<void> {
    for (const [id, driver] of this.drivers) {
      try {
        await driver.close();
        logger.info(`Shard ${id} closed.`);
      } catch (err) {
        logger.error(`Error closing shard ${id}`, err);
      }
    }
    this.drivers.clear();
    this.configs.clear();
  }
}
