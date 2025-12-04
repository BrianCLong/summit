import { ShardManager } from './ShardManager.js';
import { PartitionStrategy } from './types.js';
import { LocalityAwarePartitionStrategy } from './PartitionStrategy.js';
import { QueryContext } from './types.js';
import pino from 'pino';

const logger = pino({ name: 'GraphRouter' });

export class GraphRouter {
  private strategy: PartitionStrategy;
  private shardManager: ShardManager;

  constructor(strategy?: PartitionStrategy) {
    this.shardManager = ShardManager.getInstance();
    // Default strategy
    this.strategy = strategy || new LocalityAwarePartitionStrategy(new Map());
  }

  public setStrategy(strategy: PartitionStrategy) {
    this.strategy = strategy;
  }

  public async execute(query: string, params: any, context: QueryContext) {
    const shardId = this.strategy.resolveShard(context);
    const driver = this.shardManager.getDriver(shardId);

    if (!driver) {
      throw new Error(`Shard ${shardId} is not available.`);
    }

    const session = driver.session({
        database: 'neo4j', // Or dynamic per shard config
        defaultAccessMode: context.write ? 'WRITE' : 'READ'
    });

    try {
        // Simple "Locality Aware Cypher" - basically ensuring we route to the right node.
        // In a more advanced version, we might rewrite the query here.
        // E.g. add "USING INDEX ..." hints if needed.

        logger.debug(`Routing query to shard ${shardId}: ${query.substring(0, 50)}...`);
        const result = await session.run(query, params);
        return result;
    } finally {
        await session.close();
    }
  }

  /**
   * Broadcast a query to all shards (e.g. for schema updates or global search)
   */
  public async broadcast(query: string, params: any) {
    const shards = this.shardManager.getAllShards();
    const results = await Promise.allSettled(shards.map(async (shardId) => {
        const driver = this.shardManager.getDriver(shardId);
        if(!driver) return null;
        const session = driver.session();
        try {
            return await session.run(query, params);
        } finally {
            await session.close();
        }
    }));

    return results;
  }
}
