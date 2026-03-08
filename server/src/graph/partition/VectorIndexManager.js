"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorIndexManager = void 0;
const ShardManager_js_1 = require("./ShardManager.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'VectorIndexManager' });
class VectorIndexManager {
    shardManager;
    constructor() {
        this.shardManager = ShardManager_js_1.ShardManager.getInstance();
    }
    /**
     * Creates or updates a vector index on the specified shard (or all if not specified).
     * This simulates the "DB Performance Specialist" feature of pgvector optimization,
     * but applied to the graph side if using Neo4j vector search, OR simulating
     * a sync to a sidecar pgvector instance.
     *
     * For this implementation, we assume Neo4j 5.x+ Vector Indexes.
     */
    async ensureVectorIndex(config, shardId) {
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
        }
        else {
            const shards = this.shardManager.getAllShards();
            for (const s of shards) {
                await this.runOnShard(s, query);
            }
        }
    }
    async runOnShard(shardId, query) {
        const driver = this.shardManager.getDriver(shardId);
        if (!driver) {
            logger.warn(`Cannot create index on missing shard ${shardId}`);
            return;
        }
        const session = driver.session();
        try {
            await session.run(query);
            logger.info(`Vector index ensured on shard ${shardId}`);
        }
        catch (err) {
            logger.error(`Failed to create vector index on shard ${shardId}`, err);
            throw err;
        }
        finally {
            await session.close();
        }
    }
}
exports.VectorIndexManager = VectorIndexManager;
