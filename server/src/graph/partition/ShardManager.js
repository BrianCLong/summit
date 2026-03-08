"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardManager = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'ShardManager' });
class ShardManager {
    static instance;
    drivers = new Map();
    configs = new Map();
    constructor() { }
    static getInstance() {
        if (!ShardManager.instance) {
            ShardManager.instance = new ShardManager();
        }
        return ShardManager.instance;
    }
    async registerShard(config) {
        if (this.drivers.has(config.id)) {
            logger.warn(`Shard ${config.id} already registered. Skipping.`);
            return;
        }
        try {
            const driver = neo4j_driver_1.default.driver?.(config.uri, config.username && config.password
                ? neo4j_driver_1.default.auth.basic(config.username, config.password)
                : undefined) ||
                {
                    verifyConnectivity: async () => undefined,
                    close: async () => undefined,
                };
            if (process.env.ZERO_FOOTPRINT === 'true') {
                this.drivers.set(config.id, driver);
                this.configs.set(config.id, config);
                return;
            }
            // Basic connectivity check
            await driver.verifyConnectivity();
            this.drivers.set(config.id, driver);
            this.configs.set(config.id, config);
            logger.info(`Shard ${config.id} registered and connected.`);
        }
        catch (error) {
            logger.error(`Failed to connect to shard ${config.id}:`, error);
            // We might still register the config but mark it as down, or retry.
            // For now, fail hard or soft? Let's soft fail.
        }
    }
    getDriver(shardId) {
        return this.drivers.get(shardId);
    }
    getAllShards() {
        return Array.from(this.drivers.keys());
    }
    getShardConfig(shardId) {
        return this.configs.get(shardId);
    }
    async closeAll() {
        for (const [id, driver] of this.drivers) {
            try {
                await driver.close();
                logger.info(`Shard ${id} closed.`);
            }
            catch (err) {
                logger.error(`Error closing shard ${id}`, err);
            }
        }
        this.drivers.clear();
        this.configs.clear();
    }
}
exports.ShardManager = ShardManager;
