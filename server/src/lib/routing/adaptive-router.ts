
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
}

export default AdaptiveRouter.getInstance();
