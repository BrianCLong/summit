/**
 * Agent Registry and Discovery Service
 * Manages agent registration, discovery, and health monitoring
 */

import Redis from 'ioredis';
import { Logger } from 'pino';
import {
  AgentConfig,
  AgentMetrics,
  AgentState,
  AgentCapability,
} from '../types/agent.types.js';

export interface AgentRegistration {
  config: AgentConfig;
  state: AgentState;
  metrics: AgentMetrics;
  registeredAt: string;
  lastHeartbeat: string;
  endpoint?: string;
}

export class AgentRegistry {
  private redis: Redis;
  private logger: Logger;
  private namespace: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatIntervalMs = 30000; // 30 seconds
  private heartbeatTimeoutMs = 90000; // 90 seconds (3x heartbeat)

  constructor(redisUrl: string, logger: Logger, namespace = 'agents') {
    this.redis = new Redis(redisUrl);
    this.logger = logger.child({ component: 'AgentRegistry' });
    this.namespace = namespace;
  }

  /**
   * Register a new agent
   */
  async register(config: AgentConfig, endpoint?: string): Promise<void> {
    const registration: AgentRegistration = {
      config,
      state: AgentState.IDLE,
      metrics: {
        agentId: config.id,
        tasksCompleted: 0,
        tasksFailed: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        apiCallsCount: 0,
        apiCostUSD: 0,
        healthStatus: 'healthy',
      },
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      endpoint,
    };

    const key = this.getAgentKey(config.id);
    await this.redis.set(key, JSON.stringify(registration));

    // Add to capability indices
    for (const capability of config.capabilities) {
      await this.redis.sadd(
        this.getCapabilityKey(capability),
        config.id,
      );
    }

    // Add to type index
    await this.redis.sadd(
      this.getTypeKey(config.type),
      config.id,
    );

    this.logger.info({ agentId: config.id }, 'Agent registered');
  }

  /**
   * Unregister an agent
   */
  async unregister(agentId: string): Promise<void> {
    const registration = await this.get(agentId);
    if (!registration) {
      this.logger.warn({ agentId }, 'Agent not found for unregistration');
      return;
    }

    // Remove from capability indices
    for (const capability of registration.config.capabilities) {
      await this.redis.srem(
        this.getCapabilityKey(capability),
        agentId,
      );
    }

    // Remove from type index
    await this.redis.srem(
      this.getTypeKey(registration.config.type),
      agentId,
    );

    // Remove registration
    await this.redis.del(this.getAgentKey(agentId));

    this.logger.info({ agentId }, 'Agent unregistered');
  }

  /**
   * Get agent registration
   */
  async get(agentId: string): Promise<AgentRegistration | null> {
    const key = this.getAgentKey(agentId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * List all registered agents
   */
  async listAll(): Promise<AgentRegistration[]> {
    const pattern = `${this.namespace}:agent:*`;
    const keys = await this.redis.keys(pattern);

    const agents: AgentRegistration[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        agents.push(JSON.parse(data));
      }
    }

    return agents;
  }

  /**
   * Find agents by capability
   */
  async findByCapability(
    capability: AgentCapability,
  ): Promise<AgentRegistration[]> {
    const agentIds = await this.redis.smembers(
      this.getCapabilityKey(capability),
    );

    const agents: AgentRegistration[] = [];
    for (const agentId of agentIds) {
      const agent = await this.get(agentId);
      if (agent) {
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Find agents by type
   */
  async findByType(type: string): Promise<AgentRegistration[]> {
    const agentIds = await this.redis.smembers(this.getTypeKey(type));

    const agents: AgentRegistration[] = [];
    for (const agentId of agentIds) {
      const agent = await this.get(agentId);
      if (agent) {
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Find available agents (healthy and ready)
   */
  async findAvailable(
    capability?: AgentCapability,
  ): Promise<AgentRegistration[]> {
    let agents: AgentRegistration[];

    if (capability) {
      agents = await this.findByCapability(capability);
    } else {
      agents = await this.listAll();
    }

    // Filter for healthy and ready agents
    return agents.filter(
      (agent) =>
        agent.state === AgentState.READY &&
        agent.metrics.healthStatus === 'healthy' &&
        this.isHeartbeatValid(agent.lastHeartbeat),
    );
  }

  /**
   * Find the best agent for a task based on metrics
   */
  async findBest(
    capability: AgentCapability,
    criteria: 'success_rate' | 'speed' | 'load' = 'success_rate',
  ): Promise<AgentRegistration | null> {
    const available = await this.findAvailable(capability);
    if (available.length === 0) return null;

    switch (criteria) {
      case 'success_rate': {
        // Sort by success rate (completed / total)
        available.sort((a, b) => {
          const aTotal = a.metrics.tasksCompleted + a.metrics.tasksFailed;
          const bTotal = b.metrics.tasksCompleted + b.metrics.tasksFailed;
          const aRate = aTotal > 0 ? a.metrics.tasksCompleted / aTotal : 0;
          const bRate = bTotal > 0 ? b.metrics.tasksCompleted / bTotal : 0;
          return bRate - aRate;
        });
        break;
      }
      case 'speed': {
        // Sort by average execution time (lower is better)
        available.sort(
          (a, b) =>
            a.metrics.averageExecutionTime - b.metrics.averageExecutionTime,
        );
        break;
      }
      case 'load': {
        // Sort by tasks completed (lower is less loaded)
        available.sort(
          (a, b) => a.metrics.tasksCompleted - b.metrics.tasksCompleted,
        );
        break;
      }
    }

    return available[0];
  }

  /**
   * Update agent state
   */
  async updateState(agentId: string, state: AgentState): Promise<void> {
    const registration = await this.get(agentId);
    if (!registration) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    registration.state = state;
    await this.redis.set(
      this.getAgentKey(agentId),
      JSON.stringify(registration),
    );

    this.logger.debug({ agentId, state }, 'Agent state updated');
  }

  /**
   * Update agent metrics
   */
  async updateMetrics(agentId: string, metrics: AgentMetrics): Promise<void> {
    const registration = await this.get(agentId);
    if (!registration) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    registration.metrics = metrics;
    await this.redis.set(
      this.getAgentKey(agentId),
      JSON.stringify(registration),
    );

    this.logger.debug({ agentId }, 'Agent metrics updated');
  }

  /**
   * Send heartbeat for an agent
   */
  async heartbeat(agentId: string): Promise<void> {
    const registration = await this.get(agentId);
    if (!registration) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    registration.lastHeartbeat = new Date().toISOString();
    await this.redis.set(
      this.getAgentKey(agentId),
      JSON.stringify(registration),
    );
  }

  /**
   * Check if heartbeat is valid (within timeout window)
   */
  private isHeartbeatValid(lastHeartbeat: string): boolean {
    const lastTime = new Date(lastHeartbeat).getTime();
    const now = Date.now();
    return now - lastTime < this.heartbeatTimeoutMs;
  }

  /**
   * Start monitoring for stale agents
   */
  startMonitoring(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(async () => {
      await this.checkStaleAgents();
    }, this.heartbeatIntervalMs);

    this.logger.info('Agent monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.info('Agent monitoring stopped');
    }
  }

  /**
   * Check for stale agents and mark them as unhealthy
   */
  private async checkStaleAgents(): Promise<void> {
    const agents = await this.listAll();

    for (const agent of agents) {
      if (!this.isHeartbeatValid(agent.lastHeartbeat)) {
        this.logger.warn(
          { agentId: agent.config.id, lastHeartbeat: agent.lastHeartbeat },
          'Stale agent detected',
        );

        agent.metrics.healthStatus = 'unhealthy';
        agent.state = AgentState.ERROR;
        await this.redis.set(
          this.getAgentKey(agent.config.id),
          JSON.stringify(agent),
        );
      }
    }
  }

  /**
   * Get statistics about registered agents
   */
  async getStats(): Promise<{
    total: number;
    byState: Record<AgentState, number>;
    byHealth: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const agents = await this.listAll();

    const stats = {
      total: agents.length,
      byState: {} as Record<AgentState, number>,
      byHealth: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    // Initialize counters
    Object.values(AgentState).forEach((state) => {
      stats.byState[state] = 0;
    });

    for (const agent of agents) {
      // Count by state
      stats.byState[agent.state]++;

      // Count by health
      const health = agent.metrics.healthStatus;
      stats.byHealth[health] = (stats.byHealth[health] || 0) + 1;

      // Count by type
      const type = agent.config.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  private getAgentKey(agentId: string): string {
    return `${this.namespace}:agent:${agentId}`;
  }

  private getCapabilityKey(capability: AgentCapability): string {
    return `${this.namespace}:capability:${capability}`;
  }

  private getTypeKey(type: string): string {
    return `${this.namespace}:type:${type}`;
  }

  async close(): Promise<void> {
    this.stopMonitoring();
    await this.redis.quit();
    this.logger.info('AgentRegistry closed');
  }
}
