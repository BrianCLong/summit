import { ShardManager } from './ShardManager.js';
import { VectorIndexConfig } from './types.js';
import pino from 'pino';

const logger = pino({ name: 'VectorIndexManager' });

export class VectorIndexManager {
    private shardManager: ShardManager;

    constructor() {
        this.shardManager = ShardManager.getInstance();
    }

    /**
     * Creates or updates a vector index on the specified shard (or all if not specified).
     * This simulates the "DB Performance Specialist" feature of pgvector optimization,
     * but applied to the graph side if using Neo4j vector search, OR simulating
     * a sync to a sidecar pgvector instance.
     *
     * For this implementation, we assume Neo4j 5.x+ Vector Indexes.
     */
    public async ensureVectorIndex(config: VectorIndexConfig, shardId?: string): Promise<void> {
        const query = `
            CREATE VECTOR INDEX ${config.indexName} IF NOT EXISTS
            FOR (n:Node) ON (n.embedding)
            OPTIONS {indexConfig: {
                ` + "`vector.dimensions`" + `: ${config.dimension},
                ` + "`vector.similarity_function`" + `: '${config.metric}'
            }}
        `;

        if (shardId) {
            await this.runOnShard(shardId, query);
        } else {
            const shards = this.shardManager.getAllShards();
            for (const s of shards) {
                await this.runOnShard(s, query);
            }
        }
    }

    private async runOnShard(shardId: string, query: string) {
        const driver = this.shardManager.getDriver(shardId);
        if (!driver) {
            logger.warn(`Cannot create index on missing shard ${shardId}`);
            return;
        }
        const session = driver.session();
        try {
            await session.run(query);
            logger.info(`Vector index ensured on shard ${shardId}`);
        } catch (err) {
            logger.error(`Failed to create vector index on shard ${shardId}`, err);
            throw err;
        } finally {
            await session.close();
        }
    }
}
