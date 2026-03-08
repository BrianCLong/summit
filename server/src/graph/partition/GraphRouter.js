"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRouter = void 0;
const ShardManager_js_1 = require("./ShardManager.js");
const PartitionStrategy_js_1 = require("./PartitionStrategy.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'GraphRouter' });
class GraphRouter {
    strategy;
    shardManager;
    constructor(strategy) {
        this.shardManager = ShardManager_js_1.ShardManager.getInstance();
        // Default strategy
        this.strategy = strategy || new PartitionStrategy_js_1.LocalityAwarePartitionStrategy(new Map());
    }
    setStrategy(strategy) {
        this.strategy = strategy;
    }
    async execute(query, params, context) {
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
        }
        finally {
            await session.close();
        }
    }
    /**
     * Broadcast a query to all shards (e.g. for schema updates or global search)
     */
    async broadcast(query, params) {
        const shards = this.shardManager.getAllShards();
        const results = await Promise.allSettled(shards.map(async (shardId) => {
            const driver = this.shardManager.getDriver(shardId);
            if (!driver)
                return null;
            const session = driver.session();
            try {
                return await session.run(query, params);
            }
            finally {
                await session.close();
            }
        }));
        return results;
    }
}
exports.GraphRouter = GraphRouter;
