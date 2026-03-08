"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashShardKey = void 0;
const murmurhash_1 = __importDefault(require("murmurhash"));
/**
 * Hash-based sharding using consistent hashing with virtual nodes
 */
class HashShardKey {
    virtualNodes;
    hashRing = new Map();
    sortedHashes = [];
    constructor(virtualNodes = 150) {
        this.virtualNodes = virtualNodes;
    }
    /**
     * Initialize the hash ring with virtual nodes for each shard
     */
    initialize(shards) {
        this.hashRing.clear();
        this.sortedHashes = [];
        for (const shard of shards) {
            const weight = shard.weight || 1;
            const nodeCount = Math.floor(this.virtualNodes * weight);
            for (let i = 0; i < nodeCount; i++) {
                const virtualNodeKey = `${shard.id}:${i}`;
                const hash = murmurhash_1.default.v3(virtualNodeKey);
                this.hashRing.set(hash, shard.id);
                this.sortedHashes.push(hash);
            }
        }
        this.sortedHashes.sort((a, b) => a - b);
    }
    getName() {
        return 'hash';
    }
    getShard(key, shards) {
        if (this.sortedHashes.length === 0) {
            this.initialize(shards);
        }
        const keyStr = this.normalizeKey(key);
        const hash = murmurhash_1.default.v3(keyStr);
        // Find the first hash >= our key hash (clockwise on the ring)
        let index = this.sortedHashes.findIndex((h) => h >= hash);
        // If not found, wrap around to the first node
        if (index === -1) {
            index = 0;
        }
        const shardId = this.hashRing.get(this.sortedHashes[index]);
        const shard = shards.find((s) => s.id === shardId);
        if (!shard) {
            throw new Error(`Shard ${shardId} not found`);
        }
        return shard;
    }
    getShardsForRange(startKey, endKey, shards) {
        // For hash-based sharding, range queries require all shards
        // because data is distributed randomly
        return shards;
    }
    normalizeKey(key) {
        if (typeof key === 'string') {
            return key;
        }
        if (typeof key === 'number') {
            return key.toString();
        }
        if (typeof key === 'object' && key !== null) {
            return JSON.stringify(key);
        }
        return String(key);
    }
    /**
     * Add a new shard to the hash ring
     */
    addShard(shard) {
        const weight = shard.weight || 1;
        const nodeCount = Math.floor(this.virtualNodes * weight);
        for (let i = 0; i < nodeCount; i++) {
            const virtualNodeKey = `${shard.id}:${i}`;
            const hash = murmurhash_1.default.v3(virtualNodeKey);
            this.hashRing.set(hash, shard.id);
            this.sortedHashes.push(hash);
        }
        this.sortedHashes.sort((a, b) => a - b);
    }
    /**
     * Remove a shard from the hash ring
     */
    removeShard(shardId) {
        const hashesToRemove = [];
        for (const [hash, id] of this.hashRing.entries()) {
            if (id === shardId) {
                hashesToRemove.push(hash);
            }
        }
        for (const hash of hashesToRemove) {
            this.hashRing.delete(hash);
            const index = this.sortedHashes.indexOf(hash);
            if (index > -1) {
                this.sortedHashes.splice(index, 1);
            }
        }
    }
}
exports.HashShardKey = HashShardKey;
