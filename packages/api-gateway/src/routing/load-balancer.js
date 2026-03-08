"use strict";
/**
 * Load Balancing Strategies
 *
 * Implements various load balancing algorithms:
 * - Round Robin
 * - Weighted Round Robin
 * - Least Connections
 * - Random
 * - IP Hash
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadBalancer = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('load-balancer');
class LoadBalancer {
    strategy;
    currentIndex = 0;
    connections = new Map();
    healthCheckInterval;
    healthCheckTimer;
    constructor(strategy = 'round-robin', healthCheckInterval) {
        this.strategy = strategy;
        this.healthCheckInterval = healthCheckInterval;
        if (healthCheckInterval) {
            this.startHealthChecks();
        }
    }
    async selectBackend(backends, clientIp) {
        const healthyBackends = backends.filter(b => b.healthy !== false);
        if (healthyBackends.length === 0) {
            logger.warn('No healthy backends available');
            return null;
        }
        let selected = null;
        switch (this.strategy) {
            case 'round-robin':
                selected = this.roundRobin(healthyBackends);
                break;
            case 'weighted-round-robin':
                selected = this.weightedRoundRobin(healthyBackends);
                break;
            case 'least-connections':
                selected = this.leastConnections(healthyBackends);
                break;
            case 'random':
                selected = this.random(healthyBackends);
                break;
            case 'ip-hash':
                selected = this.ipHash(healthyBackends, clientIp || '');
                break;
            default:
                selected = this.roundRobin(healthyBackends);
        }
        if (selected) {
            this.incrementConnections(selected.url);
        }
        return selected;
    }
    releaseBackend(backendUrl) {
        this.decrementConnections(backendUrl);
    }
    roundRobin(backends) {
        const backend = backends[this.currentIndex % backends.length];
        this.currentIndex++;
        return backend;
    }
    weightedRoundRobin(backends) {
        const totalWeight = backends.reduce((sum, b) => sum + (b.weight || 1), 0);
        let random = Math.random() * totalWeight;
        for (const backend of backends) {
            random -= backend.weight || 1;
            if (random <= 0) {
                return backend;
            }
        }
        return backends[backends.length - 1];
    }
    leastConnections(backends) {
        return backends.reduce((min, backend) => {
            const currentConns = this.connections.get(backend.url) || 0;
            const minConns = this.connections.get(min.url) || 0;
            return currentConns < minConns ? backend : min;
        });
    }
    random(backends) {
        const index = Math.floor(Math.random() * backends.length);
        return backends[index];
    }
    ipHash(backends, clientIp) {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < clientIp.length; i++) {
            hash = ((hash << 5) - hash) + clientIp.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        const index = Math.abs(hash) % backends.length;
        return backends[index];
    }
    incrementConnections(url) {
        const current = this.connections.get(url) || 0;
        this.connections.set(url, current + 1);
    }
    decrementConnections(url) {
        const current = this.connections.get(url) || 0;
        if (current > 0) {
            this.connections.set(url, current - 1);
        }
    }
    startHealthChecks() {
        if (this.healthCheckInterval) {
            this.healthCheckTimer = setInterval(() => {
                logger.debug('Running health checks');
                // Health check logic would go here
            }, this.healthCheckInterval);
        }
    }
    stopHealthChecks() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
    }
    getStats() {
        return {
            strategy: this.strategy,
            connections: Object.fromEntries(this.connections),
            totalConnections: Array.from(this.connections.values()).reduce((a, b) => a + b, 0),
        };
    }
}
exports.LoadBalancer = LoadBalancer;
