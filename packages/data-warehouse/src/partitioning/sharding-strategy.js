"use strict";
/**
 * Sharding Strategy for Distributed Data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardingStrategy = exports.ShardingType = void 0;
var ShardingType;
(function (ShardingType) {
    ShardingType["HASH"] = "HASH";
    ShardingType["RANGE"] = "RANGE";
    ShardingType["GEOGRAPHIC"] = "GEOGRAPHIC";
    ShardingType["CUSTOM"] = "CUSTOM";
})(ShardingType || (exports.ShardingType = ShardingType = {}));
class ShardingStrategy {
    type;
    constructor(type) {
        this.type = type;
    }
    getShard(value, totalShards) {
        switch (this.type) {
            case ShardingType.HASH:
                return this.hashShard(value, totalShards);
            default:
                return 0;
        }
    }
    hashShard(value, totalShards) {
        const str = JSON.stringify(value);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash) % totalShards;
    }
}
exports.ShardingStrategy = ShardingStrategy;
