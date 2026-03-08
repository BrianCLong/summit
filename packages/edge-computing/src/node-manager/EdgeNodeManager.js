"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeNodeManager = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const pino_1 = require("pino");
const types_1 = require("../types");
const utils_1 = require("../utils");
/**
 * Edge Node Manager
 * Manages edge node registration, health monitoring, and lifecycle
 */
class EdgeNodeManager extends eventemitter3_1.default {
    nodes = new Map();
    configs = new Map();
    healthCheckIntervals = new Map();
    logger;
    constructor(logger) {
        super();
        this.logger = logger || (0, pino_1.pino)({ name: 'EdgeNodeManager' });
    }
    /**
     * Register a new edge node
     */
    async registerNode(metadata, config) {
        const nodeId = (0, utils_1.generateEdgeId)('node');
        const now = new Date();
        const nodeMetadata = {
            ...metadata,
            id: nodeId,
            registeredAt: now,
            lastHeartbeat: now
        };
        const nodeConfig = {
            ...config,
            id: nodeId
        };
        this.nodes.set(nodeId, nodeMetadata);
        this.configs.set(nodeId, nodeConfig);
        // Start health monitoring
        this.startHealthMonitoring(nodeId);
        this.logger.info({ nodeId, name: metadata.name }, 'Edge node registered');
        const event = {
            id: (0, utils_1.generateEdgeId)('event'),
            nodeId,
            type: 'node-online',
            severity: 'info',
            message: `Node ${metadata.name} registered`,
            timestamp: now
        };
        this.emit('node-registered', { nodeId, metadata: nodeMetadata, config: nodeConfig });
        this.emit('event', event);
        return { nodeId, config: nodeConfig };
    }
    /**
     * Deregister an edge node
     */
    async deregisterNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        // Stop health monitoring
        this.stopHealthMonitoring(nodeId);
        // Update status
        node.status = types_1.EdgeNodeStatus.DECOMMISSIONED;
        this.nodes.set(nodeId, node);
        this.logger.info({ nodeId }, 'Edge node deregistered');
        const event = {
            id: (0, utils_1.generateEdgeId)('event'),
            nodeId,
            type: 'node-offline',
            severity: 'info',
            message: `Node ${node.name} deregistered`,
            timestamp: new Date()
        };
        this.emit('node-deregistered', { nodeId });
        this.emit('event', event);
        // Remove from active nodes after a grace period
        setTimeout(() => {
            this.nodes.delete(nodeId);
            this.configs.delete(nodeId);
        }, 60000); // 1 minute grace period
    }
    /**
     * Update node heartbeat
     */
    async updateHeartbeat(nodeId, capacity) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        const now = new Date();
        node.lastHeartbeat = now;
        node.capacity = capacity;
        node.uptime = Math.floor((now.getTime() - node.registeredAt.getTime()) / 1000);
        // Validate health
        const healthCheck = (0, utils_1.validateNodeHealth)(capacity, now);
        const previousHealth = node.health;
        node.health = healthCheck.isHealthy ? types_1.HealthStatus.HEALTHY :
            (healthCheck.issues.length > 2 ? types_1.HealthStatus.UNHEALTHY : types_1.HealthStatus.WARNING);
        // Update status based on health
        if (node.status === types_1.EdgeNodeStatus.OFFLINE) {
            node.status = types_1.EdgeNodeStatus.ONLINE;
        }
        else if (!healthCheck.isHealthy && node.status === types_1.EdgeNodeStatus.ONLINE) {
            node.status = types_1.EdgeNodeStatus.DEGRADED;
        }
        else if (healthCheck.isHealthy && node.status === types_1.EdgeNodeStatus.DEGRADED) {
            node.status = types_1.EdgeNodeStatus.ONLINE;
        }
        this.nodes.set(nodeId, node);
        // Emit health change event if status changed
        if (previousHealth !== node.health) {
            const event = {
                id: (0, utils_1.generateEdgeId)('event'),
                nodeId,
                type: 'health-change',
                severity: node.health === types_1.HealthStatus.UNHEALTHY ? 'error' : 'warning',
                message: `Node ${node.name} health changed from ${previousHealth} to ${node.health}`,
                metadata: { issues: healthCheck.issues },
                timestamp: now
            };
            this.emit('health-change', { nodeId, health: node.health, issues: healthCheck.issues });
            this.emit('event', event);
        }
        this.emit('heartbeat', { nodeId, capacity });
    }
    /**
     * Get node metadata
     */
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    /**
     * Get node configuration
     */
    getNodeConfig(nodeId) {
        return this.configs.get(nodeId);
    }
    /**
     * Get all nodes
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    /**
     * Get nodes by status
     */
    getNodesByStatus(status) {
        return this.getAllNodes().filter(node => node.status === status);
    }
    /**
     * Get nodes by cluster
     */
    getNodesByCluster(clusterId) {
        return this.getAllNodes().filter(node => node.clusterId === clusterId);
    }
    /**
     * Get healthy nodes
     */
    getHealthyNodes() {
        return this.getAllNodes().filter(node => node.health === types_1.HealthStatus.HEALTHY && node.status === types_1.EdgeNodeStatus.ONLINE);
    }
    /**
     * Update node configuration
     */
    async updateNodeConfig(nodeId, config) {
        const existingConfig = this.configs.get(nodeId);
        if (!existingConfig) {
            throw new Error(`Node ${nodeId} not found`);
        }
        const updatedConfig = {
            ...existingConfig,
            ...config,
            id: nodeId // Ensure ID doesn't change
        };
        this.configs.set(nodeId, updatedConfig);
        this.logger.info({ nodeId }, 'Node configuration updated');
        this.emit('config-updated', { nodeId, config: updatedConfig });
    }
    /**
     * Set node maintenance mode
     */
    async setMaintenanceMode(nodeId, enabled) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        node.status = enabled ? types_1.EdgeNodeStatus.MAINTENANCE : types_1.EdgeNodeStatus.ONLINE;
        this.nodes.set(nodeId, node);
        this.logger.info({ nodeId, enabled }, 'Node maintenance mode updated');
        const event = {
            id: (0, utils_1.generateEdgeId)('event'),
            nodeId,
            type: 'custom',
            severity: 'info',
            message: `Node ${node.name} ${enabled ? 'entered' : 'exited'} maintenance mode`,
            timestamp: new Date()
        };
        this.emit('maintenance-mode', { nodeId, enabled });
        this.emit('event', event);
    }
    /**
     * Get node metrics
     */
    getNodeMetrics(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return [];
        }
        const now = new Date();
        return [
            {
                nodeId,
                timestamp: now,
                type: 'cpu',
                value: node.capacity.cpu.utilization,
                unit: 'percent'
            },
            {
                nodeId,
                timestamp: now,
                type: 'memory',
                value: node.capacity.memory.utilization,
                unit: 'percent'
            },
            {
                nodeId,
                timestamp: now,
                type: 'storage',
                value: node.capacity.storage.utilization,
                unit: 'percent'
            },
            {
                nodeId,
                timestamp: now,
                type: 'latency',
                value: node.capacity.network.latency,
                unit: 'ms'
            }
        ];
    }
    /**
     * Find nearest nodes to a location
     */
    findNearestNodes(location, limit = 5) {
        const { calculateDistance } = require('../utils');
        const nodesWithDistance = this.getHealthyNodes().map(node => ({
            node,
            distance: calculateDistance(location, node.location)
        }));
        return nodesWithDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit)
            .map(item => item.node);
    }
    /**
     * Find nodes with available capacity
     */
    findAvailableNodes(minCpuPercent = 20, minMemoryPercent = 20) {
        return this.getHealthyNodes().filter(node => {
            const cpuAvailable = 100 - node.capacity.cpu.utilization;
            const memoryAvailable = 100 - node.capacity.memory.utilization;
            return cpuAvailable >= minCpuPercent && memoryAvailable >= minMemoryPercent;
        });
    }
    /**
     * Start health monitoring for a node
     */
    startHealthMonitoring(nodeId) {
        // Check every 60 seconds for stale heartbeats
        const interval = setInterval(() => {
            this.checkNodeHealth(nodeId);
        }, 60000);
        this.healthCheckIntervals.set(nodeId, interval);
    }
    /**
     * Stop health monitoring for a node
     */
    stopHealthMonitoring(nodeId) {
        const interval = this.healthCheckIntervals.get(nodeId);
        if (interval) {
            clearInterval(interval);
            this.healthCheckIntervals.delete(nodeId);
        }
    }
    /**
     * Check node health based on heartbeat
     */
    checkNodeHealth(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node || node.status === types_1.EdgeNodeStatus.DECOMMISSIONED) {
            return;
        }
        const now = Date.now();
        const heartbeatAge = now - node.lastHeartbeat.getTime();
        // Mark as offline if no heartbeat in 2 minutes
        if (heartbeatAge > 120000 && node.status !== types_1.EdgeNodeStatus.OFFLINE) {
            node.status = types_1.EdgeNodeStatus.OFFLINE;
            node.health = types_1.HealthStatus.UNKNOWN;
            this.nodes.set(nodeId, node);
            this.logger.warn({ nodeId, heartbeatAge }, 'Node marked as offline due to stale heartbeat');
            const event = {
                id: (0, utils_1.generateEdgeId)('event'),
                nodeId,
                type: 'node-offline',
                severity: 'error',
                message: `Node ${node.name} went offline (last heartbeat ${Math.floor(heartbeatAge / 1000)}s ago)`,
                timestamp: new Date()
            };
            this.emit('node-offline', { nodeId });
            this.emit('event', event);
        }
    }
    /**
     * Get cluster statistics
     */
    getClusterStats(clusterId) {
        const nodes = clusterId
            ? this.getNodesByCluster(clusterId)
            : this.getAllNodes();
        const onlineNodes = nodes.filter(n => n.status === types_1.EdgeNodeStatus.ONLINE);
        const healthyNodes = nodes.filter(n => n.health === types_1.HealthStatus.HEALTHY);
        const avgCpu = nodes.length > 0
            ? nodes.reduce((sum, n) => sum + n.capacity.cpu.utilization, 0) / nodes.length
            : 0;
        const avgMemory = nodes.length > 0
            ? nodes.reduce((sum, n) => sum + n.capacity.memory.utilization, 0) / nodes.length
            : 0;
        const avgStorage = nodes.length > 0
            ? nodes.reduce((sum, n) => sum + n.capacity.storage.utilization, 0) / nodes.length
            : 0;
        return {
            totalNodes: nodes.length,
            onlineNodes: onlineNodes.length,
            offlineNodes: nodes.filter(n => n.status === types_1.EdgeNodeStatus.OFFLINE).length,
            healthyNodes: healthyNodes.length,
            avgCpuUtilization: avgCpu,
            avgMemoryUtilization: avgMemory,
            avgStorageUtilization: avgStorage
        };
    }
    /**
     * Shutdown and cleanup
     */
    async shutdown() {
        // Stop all health monitoring
        for (const [nodeId] of this.healthCheckIntervals) {
            this.stopHealthMonitoring(nodeId);
        }
        this.removeAllListeners();
        this.logger.info('EdgeNodeManager shut down');
    }
}
exports.EdgeNodeManager = EdgeNodeManager;
