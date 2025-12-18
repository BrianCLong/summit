
import { Backend } from './types';

/**
 * @class AdaptiveRouter
 * @description Provides adaptive routing algorithms based on real-time metrics.
 */
class AdaptiveRouter {
  private static instance: AdaptiveRouter;
  private backends: Backend[] = [];
  private currentIndex = -1;
  private currentWeights: Map<string, number> = new Map();

  private constructor() {}

  /**
   * Singleton instance accessor.
   * @returns {AdaptiveRouter} The singleton instance.
   */
  public static getInstance(): AdaptiveRouter {
    if (!AdaptiveRouter.instance) {
      AdaptiveRouter.instance = new AdaptiveRouter();
    }
    return AdaptiveRouter.instance;
  }

  /**
   * Updates the list of available backends.
   * @param {Backend[]} backends - The list of backends.
   */
  public updateBackends(backends: Backend[]): void {
    this.backends = backends;
  }

  /**
   * Selects a backend using a weighted round-robin algorithm.
   * This implementation uses the smooth weighted round-robin algorithm.
   * @returns {Backend | null} The selected backend, or null if no healthy backends are available.
   */
  public weightedRoundRobin(): Backend | null {
    const healthyBackends = this.backends.filter(b => b.status === 'UP');
    if (healthyBackends.length === 0) {
      return null;
    }

    let best = healthyBackends[0];
    let totalWeight = 0;

    for (const backend of healthyBackends) {
      const currentWeight = this.currentWeights.get(backend.id) || 0;
      this.currentWeights.set(backend.id, currentWeight + backend.weight);
      totalWeight += backend.weight;

      if (!best || (this.currentWeights.get(backend.id) ?? 0) > (this.currentWeights.get(best.id) ?? 0)) {
        best = backend;
      }
    }

    const bestWeight = this.currentWeights.get(best.id) || 0;
    this.currentWeights.set(best.id, bestWeight - totalWeight);

    return best;
  }

  /**
   * Selects a backend using the least connections algorithm.
   * @returns {Backend | null} The backend with the fewest connections, or null if no healthy backends are available.
   */
  public leastConnections(): Backend | null {
    const healthyBackends = this.backends.filter(b => b.status === 'UP');
    if (healthyBackends.length === 0) {
      return null;
    }

    return healthyBackends.reduce((prev, curr) => (prev.connections < curr.connections ? prev : curr));
  }

  /**
   * Selects a backend based on the lowest latency.
   * @returns {Backend | null} The backend with the lowest latency, or null if no healthy backends are available.
   */
  public lowestLatency(): Backend | null {
    const healthyBackends = this.backends.filter(b => b.status === 'UP');
    if (healthyBackends.length === 0) {
      return null;
    }

    return healthyBackends.reduce((prev, curr) => (prev.latency < curr.latency ? prev : curr));
  }

  /**
   * Placeholder for geographic-aware routing.
   * @param {string} userRegion - The region of the user.
   * @returns {Backend | null} The selected backend.
   */
  public geographicRouting(userRegion: string): Backend | null {
    // In a real implementation, this would select the backend closest to the user's region.
    // For now, we'll just use weighted round-robin.
    return this.weightedRoundRobin();
  }

  /**
   * Placeholder for cost-aware routing.
   * @returns {Backend | null} The selected backend.
   */
  public costAwareRouting(): Backend | null {
    // In a real implementation, this would select the backend with the lowest cost.
    // For now, we'll just use weighted round-robin.
    return this.weightedRoundRobin();
  }

  /**
   * Placeholder for circuit breaker integration.
   * @param {string} backendId - The ID of the backend.
   * @returns {boolean} True if the circuit is open, false otherwise.
   */
  public isCircuitOpen(backendId: string): boolean {
    // In a real implementation, this would check the status of a circuit breaker for the backend.
    return false;
  }

  /**
   * Selects a write-capable backend (PRIMARY).
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Backend | null} A primary backend, or null if none available.
   */
  public getWriteBackend(tenantId: string): Backend | null {
    // Check feature flag - simplified mock
    const writeShardingEnabled = this.checkFlag('WRITE_SHARDING_PILOT', tenantId);

    if (!writeShardingEnabled) {
      // Default behavior: any healthy primary
      return this.backends.find(b => b.role === 'PRIMARY' && b.status === 'UP') || null;
    }

    // Pilot logic: For now, still return a Primary, but logic could be extended for sharding
    // e.g., consistent hashing based on tenantId to select specific Primary shard
    return this.backends.find(b => b.role === 'PRIMARY' && b.status === 'UP') || null;
  }

  /**
   * Selects a read backend, preferring local replicas.
   * @param {string} tenantId - The tenant ID.
   * @param {string} region - The region of the request.
   * @returns {Backend | null} A suitable backend for reading.
   */
  public getReadBackend(tenantId: string, region?: string): Backend | null {
    const healthy = this.backends.filter(b => b.status === 'UP');
    if (healthy.length === 0) return null;

    if (region) {
      const localReplica = healthy.find(b => b.role === 'REPLICA' && b.region === region);
      if (localReplica) return localReplica;
    }

    // Fallback to Primary
    return healthy.find(b => b.role === 'PRIMARY') || healthy[0];
  }

  private checkFlag(flag: string, context: string): boolean {
    // Mock implementation - integrated with feature flags in real system
    // In production, this would call FeatureFlags.isEnabled(flag, { tenantId: context })
    return false;
  }
}

export default AdaptiveRouter.getInstance();
