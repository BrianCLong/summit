"use strict";
/**
 * Database Sharding Package
 *
 * Provides horizontal sharding capabilities for PostgreSQL with:
 * - Hash-based and range-based shard key strategies
 * - Shard routing and query distribution
 * - Cross-shard query optimization
 * - Read replica load balancing
 * - Connection pooling per shard
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardConnectionPool = exports.ReadReplicaLoadBalancer = exports.CrossShardQueryExecutor = exports.GeographicShardKey = exports.RangeShardKey = exports.HashShardKey = exports.QueryDistributor = exports.ShardRouter = exports.ShardManager = void 0;
var ShardManager_1 = require("./ShardManager");
Object.defineProperty(exports, "ShardManager", { enumerable: true, get: function () { return ShardManager_1.ShardManager; } });
var ShardRouter_1 = require("./ShardRouter");
Object.defineProperty(exports, "ShardRouter", { enumerable: true, get: function () { return ShardRouter_1.ShardRouter; } });
var QueryDistributor_1 = require("./QueryDistributor");
Object.defineProperty(exports, "QueryDistributor", { enumerable: true, get: function () { return QueryDistributor_1.QueryDistributor; } });
var strategies_1 = require("./strategies");
Object.defineProperty(exports, "HashShardKey", { enumerable: true, get: function () { return strategies_1.HashShardKey; } });
Object.defineProperty(exports, "RangeShardKey", { enumerable: true, get: function () { return strategies_1.RangeShardKey; } });
Object.defineProperty(exports, "GeographicShardKey", { enumerable: true, get: function () { return strategies_1.GeographicShardKey; } });
var CrossShardQueryExecutor_1 = require("./CrossShardQueryExecutor");
Object.defineProperty(exports, "CrossShardQueryExecutor", { enumerable: true, get: function () { return CrossShardQueryExecutor_1.CrossShardQueryExecutor; } });
var ReadReplicaLoadBalancer_1 = require("./ReadReplicaLoadBalancer");
Object.defineProperty(exports, "ReadReplicaLoadBalancer", { enumerable: true, get: function () { return ReadReplicaLoadBalancer_1.ReadReplicaLoadBalancer; } });
var ShardConnectionPool_1 = require("./ShardConnectionPool");
Object.defineProperty(exports, "ShardConnectionPool", { enumerable: true, get: function () { return ShardConnectionPool_1.ShardConnectionPool; } });
__exportStar(require("./types"), exports);
