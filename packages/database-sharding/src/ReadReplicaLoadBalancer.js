"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadReplicaLoadBalancer = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'ReadReplicaLoadBalancer' });
const tracer = api_1.trace.getTracer('database-sharding');
/**
 * Load balancer for read replicas
 */
class ReadReplicaLoadBalancer {
    shard;
    strategy;
    currentIndex = 0;
    replicaStats = new Map();
    constructor(shard, strategy = 'round-robin') {
        this.shard = shard;
        this.strategy = strategy;
        // Initialize stats for each replica
        if (shard.replicas) {
            for (let i = 0; i < shard.replicas.length; i++) {
                this.replicaStats.set(i, {
                    connections: 0,
                    latency: 0,
                    errorRate: 0,
                });
            }
        }
    }
    /**
     * Select the best replica based on load balancing strategy
     */
    selectReplica() {
        const span = tracer.startSpan('ReadReplicaLoadBalancer.selectReplica');
        try {
            if (!this.shard.replicas || this.shard.replicas.length === 0) {
                return null; // Use primary
            }
            let selectedIndex;
            switch (this.strategy) {
                case 'round-robin':
                    selectedIndex = this.roundRobin();
                    break;
                case 'least-connections':
                    selectedIndex = this.leastConnections();
                    break;
                case 'random':
                    selectedIndex = this.random();
                    break;
                case 'weighted':
                    selectedIndex = this.weighted();
                    break;
                default:
                    selectedIndex = this.roundRobin();
            }
            span.setAttributes({
                'replica.index': selectedIndex,
                'strategy': this.strategy,
            });
            return selectedIndex;
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Round-robin selection
     */
    roundRobin() {
        const index = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.shard.replicas.length;
        return index;
    }
    /**
     * Least connections selection
     */
    leastConnections() {
        let minConnections = Infinity;
        let selectedIndex = 0;
        for (const [index, stats] of this.replicaStats.entries()) {
            if (stats.connections < minConnections) {
                minConnections = stats.connections;
                selectedIndex = index;
            }
        }
        return selectedIndex;
    }
    /**
     * Random selection
     */
    random() {
        return Math.floor(Math.random() * this.shard.replicas.length);
    }
    /**
     * Weighted selection based on replica weight and health
     */
    weighted() {
        const weights = [];
        for (const [index, stats] of this.replicaStats.entries()) {
            // Lower weight for replicas with higher latency or error rate
            const healthScore = 1.0 - stats.errorRate;
            const latencyScore = 1.0 / (1.0 + stats.latency / 1000);
            const weight = healthScore * latencyScore;
            weights.push(weight);
        }
        // Weighted random selection
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i;
            }
        }
        return 0;
    }
    /**
     * Update replica statistics
     */
    updateStats(replicaIndex, stats) {
        const current = this.replicaStats.get(replicaIndex);
        if (current) {
            this.replicaStats.set(replicaIndex, {
                ...current,
                ...stats,
            });
        }
    }
    /**
     * Increment connection count
     */
    incrementConnections(replicaIndex) {
        const stats = this.replicaStats.get(replicaIndex);
        if (stats) {
            stats.connections++;
        }
    }
    /**
     * Decrement connection count
     */
    decrementConnections(replicaIndex) {
        const stats = this.replicaStats.get(replicaIndex);
        if (stats) {
            stats.connections = Math.max(0, stats.connections - 1);
        }
    }
    /**
     * Get current statistics
     */
    getStats() {
        return Array.from(this.replicaStats.entries()).map(([index, stats]) => ({
            index,
            ...stats,
        }));
    }
    /**
     * Change load balancing strategy
     */
    changeStrategy(strategy) {
        this.strategy = strategy;
        logger.info({ strategy }, 'Load balancing strategy changed');
    }
}
exports.ReadReplicaLoadBalancer = ReadReplicaLoadBalancer;
