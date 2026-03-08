"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalityAwarePartitionStrategy = void 0;
const ShardManager_js_1 = require("./ShardManager.js");
class LocalityAwarePartitionStrategy {
    shardMap; // region -> shardId
    constructor(shardMap) {
        this.shardMap = shardMap;
    }
    resolveShard(context) {
        // 1. If explicit region provided, use it
        if (context.region && this.shardMap.has(context.region)) {
            return this.shardMap.get(context.region);
        }
        // 2. Fallback: Tenant affinity (mock implementation)
        // In a real system, we'd look up tenant->region mapping in a meta-store.
        // Here we'll just hash the tenantId to available shards if no region.
        const allShards = ShardManager_js_1.ShardManager.getInstance().getAllShards();
        if (allShards.length === 0) {
            throw new Error("No shards available");
        }
        if (context.tenantId) {
            const hash = this.simpleHash(context.tenantId);
            return allShards[hash % allShards.length];
        }
        // 3. Default: First available
        return allShards[0];
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}
exports.LocalityAwarePartitionStrategy = LocalityAwarePartitionStrategy;
