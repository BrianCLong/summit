import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { ShardConnectionPool } from './ShardConnectionPool';
import { ShardConfig } from './types';

const logger = pino({ name: 'ReadReplicaLoadBalancer' });
const tracer = trace.getTracer('database-sharding');

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'least-connections'
  | 'random'
  | 'weighted';

/**
 * Load balancer for read replicas
 */
export class ReadReplicaLoadBalancer {
  private currentIndex = 0;
  private replicaStats: Map<
    number,
    { connections: number; latency: number; errorRate: number }
  > = new Map();

  constructor(
    private shard: ShardConfig,
    private strategy: LoadBalancingStrategy = 'round-robin'
  ) {
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
  selectReplica(): number | null {
    const span = tracer.startSpan('ReadReplicaLoadBalancer.selectReplica');

    try {
      if (!this.shard.replicas || this.shard.replicas.length === 0) {
        return null; // Use primary
      }

      let selectedIndex: number;

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
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobin(): number {
    const index = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.shard.replicas!.length;
    return index;
  }

  /**
   * Least connections selection
   */
  private leastConnections(): number {
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
  private random(): number {
    return Math.floor(Math.random() * this.shard.replicas!.length);
  }

  /**
   * Weighted selection based on replica weight and health
   */
  private weighted(): number {
    const weights: number[] = [];

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
  updateStats(
    replicaIndex: number,
    stats: Partial<{
      connections: number;
      latency: number;
      errorRate: number;
    }>
  ): void {
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
  incrementConnections(replicaIndex: number): void {
    const stats = this.replicaStats.get(replicaIndex);
    if (stats) {
      stats.connections++;
    }
  }

  /**
   * Decrement connection count
   */
  decrementConnections(replicaIndex: number): void {
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
  changeStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    logger.info({ strategy }, 'Load balancing strategy changed');
  }
}
