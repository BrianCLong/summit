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

import { Backend } from './router.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('load-balancer');

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'weighted-round-robin'
  | 'least-connections'
  | 'random'
  | 'ip-hash';

export class LoadBalancer {
  private strategy: LoadBalancingStrategy;
  private currentIndex = 0;
  private connections = new Map<string, number>();
  private healthCheckInterval?: number;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(strategy: LoadBalancingStrategy = 'round-robin', healthCheckInterval?: number) {
    this.strategy = strategy;
    this.healthCheckInterval = healthCheckInterval;

    if (healthCheckInterval) {
      this.startHealthChecks();
    }
  }

  async selectBackend(backends: Backend[], clientIp?: string): Promise<Backend | null> {
    const healthyBackends = backends.filter(b => b.healthy !== false);

    if (healthyBackends.length === 0) {
      logger.warn('No healthy backends available');
      return null;
    }

    let selected: Backend | null = null;

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

  releaseBackend(backendUrl: string): void {
    this.decrementConnections(backendUrl);
  }

  private roundRobin(backends: Backend[]): Backend {
    const backend = backends[this.currentIndex % backends.length];
    this.currentIndex++;
    return backend;
  }

  private weightedRoundRobin(backends: Backend[]): Backend {
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

  private leastConnections(backends: Backend[]): Backend {
    return backends.reduce((min, backend) => {
      const currentConns = this.connections.get(backend.url) || 0;
      const minConns = this.connections.get(min.url) || 0;
      return currentConns < minConns ? backend : min;
    });
  }

  private random(backends: Backend[]): Backend {
    const index = Math.floor(Math.random() * backends.length);
    return backends[index];
  }

  private ipHash(backends: Backend[], clientIp: string): Backend {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < clientIp.length; i++) {
      hash = ((hash << 5) - hash) + clientIp.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    const index = Math.abs(hash) % backends.length;
    return backends[index];
  }

  private incrementConnections(url: string): void {
    const current = this.connections.get(url) || 0;
    this.connections.set(url, current + 1);
  }

  private decrementConnections(url: string): void {
    const current = this.connections.get(url) || 0;
    if (current > 0) {
      this.connections.set(url, current - 1);
    }
  }

  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      this.healthCheckTimer = setInterval(() => {
        logger.debug('Running health checks');
        // Health check logic would go here
      }, this.healthCheckInterval);
    }
  }

  stopHealthChecks(): void {
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
