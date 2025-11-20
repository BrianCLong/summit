/**
 * Client Selection Strategies for Federated Learning
 * Implements various strategies for selecting clients in each round
 */

import { ClientConfig, ClientSelectionStrategy } from '../types.js';

export class ClientSelector {
  /**
   * Select clients for a federated learning round
   */
  selectClients(
    clients: ClientConfig[],
    minClients: number,
    maxClients: number,
    clientFraction: number,
    strategy: ClientSelectionStrategy = { strategy: 'random' }
  ): ClientConfig[] {
    const targetCount = Math.min(
      maxClients,
      Math.max(minClients, Math.floor(clients.length * clientFraction))
    );

    switch (strategy.strategy) {
      case 'random':
        return this.randomSelection(clients, targetCount);
      case 'importance':
        return this.importanceBasedSelection(clients, targetCount, strategy.parameters);
      case 'fairness':
        return this.fairnessBasedSelection(clients, targetCount, strategy.parameters);
      case 'clustered':
        return this.clusteredSelection(clients, targetCount, strategy.parameters);
      default:
        return this.randomSelection(clients, targetCount);
    }
  }

  /**
   * Random client selection (baseline FedAvg)
   */
  private randomSelection(clients: ClientConfig[], count: number): ClientConfig[] {
    const shuffled = [...clients].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Importance-based selection (prioritize clients with more data or better resources)
   */
  private importanceBasedSelection(
    clients: ClientConfig[],
    count: number,
    params?: Record<string, any>
  ): ClientConfig[] {
    const dataWeight = params?.dataWeight ?? 0.5;
    const computeWeight = params?.computeWeight ?? 0.3;
    const reliabilityWeight = params?.reliabilityWeight ?? 0.2;

    const scored = clients.map((client) => ({
      client,
      score:
        client.dataSize * dataWeight +
        client.computeCapability * computeWeight +
        (client.isReliable ? 1 : 0) * reliabilityWeight,
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map((s) => s.client);
  }

  /**
   * Fairness-based selection (ensure all clients participate equally over time)
   */
  private fairnessBasedSelection(
    clients: ClientConfig[],
    count: number,
    params?: Record<string, any>
  ): ClientConfig[] {
    const participationHistory = params?.participationHistory ?? new Map<string, number>();

    const scored = clients.map((client) => ({
      client,
      score: 1 / ((participationHistory.get(client.clientId) ?? 0) + 1),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map((s) => s.client);
  }

  /**
   * Clustered selection (select clients from different clusters for diversity)
   */
  private clusteredSelection(
    clients: ClientConfig[],
    count: number,
    params?: Record<string, any>
  ): ClientConfig[] {
    const clusters = params?.clusters ?? this.clusterClients(clients, 5);
    const clientsPerCluster = Math.ceil(count / clusters.length);

    const selected: ClientConfig[] = [];

    for (const cluster of clusters) {
      const shuffled = [...cluster].sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, clientsPerCluster));

      if (selected.length >= count) break;
    }

    return selected.slice(0, count);
  }

  /**
   * Simple k-means clustering of clients
   */
  private clusterClients(clients: ClientConfig[], k: number): ClientConfig[][] {
    // Simple clustering based on data size and compute capability
    const normalized = clients.map((c) => ({
      client: c,
      features: [
        c.dataSize / Math.max(...clients.map((x) => x.dataSize)),
        c.computeCapability / Math.max(...clients.map((x) => x.computeCapability)),
      ],
    }));

    // Initialize centroids randomly
    const centroids = normalized
      .sort(() => Math.random() - 0.5)
      .slice(0, k)
      .map((n) => n.features);

    // Run k-means for a few iterations
    for (let iter = 0; iter < 10; iter++) {
      const clusters: typeof normalized[][] = Array.from({ length: k }, () => []);

      // Assign to nearest centroid
      for (const item of normalized) {
        let minDist = Infinity;
        let minIdx = 0;

        for (let i = 0; i < centroids.length; i++) {
          const dist = this.euclideanDistance(item.features, centroids[i]);
          if (dist < minDist) {
            minDist = dist;
            minIdx = i;
          }
        }

        clusters[minIdx].push(item);
      }

      // Update centroids
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > 0) {
          centroids[i] = [
            clusters[i].reduce((sum, item) => sum + item.features[0], 0) / clusters[i].length,
            clusters[i].reduce((sum, item) => sum + item.features[1], 0) / clusters[i].length,
          ];
        }
      }
    }

    // Final clustering
    const finalClusters: ClientConfig[][] = Array.from({ length: k }, () => []);

    for (const item of normalized) {
      let minDist = Infinity;
      let minIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = this.euclideanDistance(item.features, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }

      finalClusters[minIdx].push(item.client);
    }

    return finalClusters.filter((c) => c.length > 0);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }
}
