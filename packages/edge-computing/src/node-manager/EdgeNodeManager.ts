import EventEmitter from 'eventemitter3';
import { pino, type Logger } from 'pino';
import {
  EdgeNodeMetadata,
  EdgeNodeConfig,
  EdgeNodeStatus,
  HealthStatus,
  EdgeEvent,
  EdgeMetric,
  ResourceCapacity
} from '../types';
import { validateNodeHealth, generateEdgeId, retryWithBackoff } from '../utils';

/**
 * Edge Node Manager
 * Manages edge node registration, health monitoring, and lifecycle
 */
export class EdgeNodeManager extends EventEmitter {
  private nodes: Map<string, EdgeNodeMetadata> = new Map();
  private configs: Map<string, EdgeNodeConfig> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || pino({ name: 'EdgeNodeManager' });
  }

  /**
   * Register a new edge node
   */
  async registerNode(
    metadata: Omit<EdgeNodeMetadata, 'id' | 'registeredAt' | 'lastHeartbeat'>,
    config: Omit<EdgeNodeConfig, 'id'>
  ): Promise<{ nodeId: string; config: EdgeNodeConfig }> {
    const nodeId = generateEdgeId('node');
    const now = new Date();

    const nodeMetadata: EdgeNodeMetadata = {
      ...metadata,
      id: nodeId,
      registeredAt: now,
      lastHeartbeat: now
    };

    const nodeConfig: EdgeNodeConfig = {
      ...config,
      id: nodeId
    };

    this.nodes.set(nodeId, nodeMetadata);
    this.configs.set(nodeId, nodeConfig);

    // Start health monitoring
    this.startHealthMonitoring(nodeId);

    this.logger.info({ nodeId, name: metadata.name }, 'Edge node registered');

    const event: EdgeEvent = {
      id: generateEdgeId('event'),
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
  async deregisterNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Stop health monitoring
    this.stopHealthMonitoring(nodeId);

    // Update status
    node.status = EdgeNodeStatus.DECOMMISSIONED;
    this.nodes.set(nodeId, node);

    this.logger.info({ nodeId }, 'Edge node deregistered');

    const event: EdgeEvent = {
      id: generateEdgeId('event'),
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
  async updateHeartbeat(nodeId: string, capacity: ResourceCapacity): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const now = new Date();
    node.lastHeartbeat = now;
    node.capacity = capacity;
    node.uptime = Math.floor((now.getTime() - node.registeredAt.getTime()) / 1000);

    // Validate health
    const healthCheck = validateNodeHealth(capacity, now);
    const previousHealth = node.health;
    node.health = healthCheck.isHealthy ? HealthStatus.HEALTHY :
      (healthCheck.issues.length > 2 ? HealthStatus.UNHEALTHY : HealthStatus.WARNING);

    // Update status based on health
    if (node.status === EdgeNodeStatus.OFFLINE) {
      node.status = EdgeNodeStatus.ONLINE;
    } else if (!healthCheck.isHealthy && node.status === EdgeNodeStatus.ONLINE) {
      node.status = EdgeNodeStatus.DEGRADED;
    } else if (healthCheck.isHealthy && node.status === EdgeNodeStatus.DEGRADED) {
      node.status = EdgeNodeStatus.ONLINE;
    }

    this.nodes.set(nodeId, node);

    // Emit health change event if status changed
    if (previousHealth !== node.health) {
      const event: EdgeEvent = {
        id: generateEdgeId('event'),
        nodeId,
        type: 'health-change',
        severity: node.health === HealthStatus.UNHEALTHY ? 'error' : 'warning',
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
  getNode(nodeId: string): EdgeNodeMetadata | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get node configuration
   */
  getNodeConfig(nodeId: string): EdgeNodeConfig | undefined {
    return this.configs.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): EdgeNodeMetadata[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes by status
   */
  getNodesByStatus(status: EdgeNodeStatus): EdgeNodeMetadata[] {
    return this.getAllNodes().filter(node => node.status === status);
  }

  /**
   * Get nodes by cluster
   */
  getNodesByCluster(clusterId: string): EdgeNodeMetadata[] {
    return this.getAllNodes().filter(node => node.clusterId === clusterId);
  }

  /**
   * Get healthy nodes
   */
  getHealthyNodes(): EdgeNodeMetadata[] {
    return this.getAllNodes().filter(
      node => node.health === HealthStatus.HEALTHY && node.status === EdgeNodeStatus.ONLINE
    );
  }

  /**
   * Update node configuration
   */
  async updateNodeConfig(nodeId: string, config: Partial<EdgeNodeConfig>): Promise<void> {
    const existingConfig = this.configs.get(nodeId);
    if (!existingConfig) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const updatedConfig: EdgeNodeConfig = {
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
  async setMaintenanceMode(nodeId: string, enabled: boolean): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    node.status = enabled ? EdgeNodeStatus.MAINTENANCE : EdgeNodeStatus.ONLINE;
    this.nodes.set(nodeId, node);

    this.logger.info({ nodeId, enabled }, 'Node maintenance mode updated');

    const event: EdgeEvent = {
      id: generateEdgeId('event'),
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
  getNodeMetrics(nodeId: string): EdgeMetric[] {
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
  findNearestNodes(location: { latitude: number; longitude: number }, limit: number = 5): EdgeNodeMetadata[] {
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
  findAvailableNodes(minCpuPercent: number = 20, minMemoryPercent: number = 20): EdgeNodeMetadata[] {
    return this.getHealthyNodes().filter(node => {
      const cpuAvailable = 100 - node.capacity.cpu.utilization;
      const memoryAvailable = 100 - node.capacity.memory.utilization;
      return cpuAvailable >= minCpuPercent && memoryAvailable >= minMemoryPercent;
    });
  }

  /**
   * Start health monitoring for a node
   */
  private startHealthMonitoring(nodeId: string): void {
    // Check every 60 seconds for stale heartbeats
    const interval = setInterval(() => {
      this.checkNodeHealth(nodeId);
    }, 60000);

    this.healthCheckIntervals.set(nodeId, interval);
  }

  /**
   * Stop health monitoring for a node
   */
  private stopHealthMonitoring(nodeId: string): void {
    const interval = this.healthCheckIntervals.get(nodeId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(nodeId);
    }
  }

  /**
   * Check node health based on heartbeat
   */
  private checkNodeHealth(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node || node.status === EdgeNodeStatus.DECOMMISSIONED) {
      return;
    }

    const now = Date.now();
    const heartbeatAge = now - node.lastHeartbeat.getTime();

    // Mark as offline if no heartbeat in 2 minutes
    if (heartbeatAge > 120000 && node.status !== EdgeNodeStatus.OFFLINE) {
      node.status = EdgeNodeStatus.OFFLINE;
      node.health = HealthStatus.UNKNOWN;
      this.nodes.set(nodeId, node);

      this.logger.warn({ nodeId, heartbeatAge }, 'Node marked as offline due to stale heartbeat');

      const event: EdgeEvent = {
        id: generateEdgeId('event'),
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
  getClusterStats(clusterId?: string): {
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    healthyNodes: number;
    avgCpuUtilization: number;
    avgMemoryUtilization: number;
    avgStorageUtilization: number;
  } {
    const nodes = clusterId
      ? this.getNodesByCluster(clusterId)
      : this.getAllNodes();

    const onlineNodes = nodes.filter(n => n.status === EdgeNodeStatus.ONLINE);
    const healthyNodes = nodes.filter(n => n.health === HealthStatus.HEALTHY);

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
      offlineNodes: nodes.filter(n => n.status === EdgeNodeStatus.OFFLINE).length,
      healthyNodes: healthyNodes.length,
      avgCpuUtilization: avgCpu,
      avgMemoryUtilization: avgMemory,
      avgStorageUtilization: avgStorage
    };
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    // Stop all health monitoring
    for (const [nodeId] of this.healthCheckIntervals) {
      this.stopHealthMonitoring(nodeId);
    }

    this.removeAllListeners();
    this.logger.info('EdgeNodeManager shut down');
  }
}
