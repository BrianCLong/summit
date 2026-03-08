"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeographicShardKey = void 0;
/**
 * Geographic sharding for data locality (e.g., by region, country, datacenter)
 */
class GeographicShardKey {
    geographyMap = new Map();
    getName() {
        return 'geographic';
    }
    /**
     * Initialize geography to shard mapping
     */
    initialize(shards) {
        this.geographyMap.clear();
        for (const shard of shards) {
            if (shard.geography) {
                // Support multiple geographies per shard (comma-separated)
                const geographies = shard.geography.split(',').map((g) => g.trim());
                for (const geo of geographies) {
                    this.geographyMap.set(geo.toLowerCase(), shard.id);
                }
            }
        }
    }
    getShard(key, shards) {
        if (this.geographyMap.size === 0) {
            this.initialize(shards);
        }
        // Extract geography from key
        const geography = this.extractGeography(key);
        const shardId = this.geographyMap.get(geography.toLowerCase());
        if (shardId) {
            const shard = shards.find((s) => s.id === shardId);
            if (shard) {
                return shard;
            }
        }
        // Fallback to default shard
        const defaultShard = shards.find((s) => s.geography?.toLowerCase() === 'default');
        if (defaultShard) {
            return defaultShard;
        }
        // Last resort: first shard
        if (shards.length > 0) {
            return shards[0];
        }
        throw new Error(`No shard found for geography ${geography}`);
    }
    getShardsForRange(startKey, endKey, shards) {
        // For geographic sharding, we might need multiple shards if the range
        // spans multiple geographies
        const geographies = this.extractGeographyRange(startKey, endKey);
        const matchingShards = [];
        for (const geo of geographies) {
            const shardId = this.geographyMap.get(geo.toLowerCase());
            if (shardId) {
                const shard = shards.find((s) => s.id === shardId);
                if (shard && !matchingShards.includes(shard)) {
                    matchingShards.push(shard);
                }
            }
        }
        return matchingShards.length > 0 ? matchingShards : shards;
    }
    extractGeography(key) {
        // Support multiple key formats
        if (typeof key === 'string') {
            // e.g., "us-east-1:user123" or "eu:tenant456"
            const parts = key.split(':');
            if (parts.length > 1) {
                return parts[0];
            }
            return key;
        }
        if (typeof key === 'object' && key !== null) {
            // e.g., { geography: "us-west-2", id: "user123" }
            return key.geography || key.region || key.country || 'default';
        }
        return 'default';
    }
    extractGeographyRange(startKey, endKey) {
        // For simplicity, extract from both keys
        const startGeo = this.extractGeography(startKey);
        const endGeo = this.extractGeography(endKey);
        const geographies = [startGeo];
        if (endGeo !== startGeo) {
            geographies.push(endGeo);
        }
        return geographies;
    }
    /**
     * Get all supported geographies
     */
    getSupportedGeographies() {
        return Array.from(this.geographyMap.keys());
    }
    /**
     * Add a new geography mapping
     */
    addGeography(geography, shardId) {
        this.geographyMap.set(geography.toLowerCase(), shardId);
    }
    /**
     * Remove a geography mapping
     */
    removeGeography(geography) {
        this.geographyMap.delete(geography.toLowerCase());
    }
}
exports.GeographicShardKey = GeographicShardKey;
