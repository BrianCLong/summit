/**
 * Federated Averaging (FedAvg) Aggregation Algorithm
 * Weighted average of client model updates based on data size
 */

import {
  ClientUpdate,
  ModelWeights,
  FederatedConfig,
  AggregationResult,
  RoundMetrics,
} from '../types.js';

export class FedAvgAggregator {
  /**
   * Aggregate client updates using FedAvg algorithm
   */
  async aggregate(
    updates: ClientUpdate[],
    config: FederatedConfig
  ): Promise<AggregationResult> {
    if (updates.length === 0) {
      throw new Error('No client updates to aggregate');
    }

    const totalSamples = updates.reduce((sum, update) => sum + update.numSamples, 0);

    // Initialize aggregated weights with zeros
    const aggregatedWeights: ModelWeights = {};
    const firstUpdate = updates[0];

    // Initialize structure
    for (const [layerName, weights] of Object.entries(firstUpdate.weights)) {
      if (Array.isArray(weights[0])) {
        // 2D array
        aggregatedWeights[layerName] = (weights as number[][]).map((row) =>
          new Array(row.length).fill(0)
        );
      } else {
        // 1D array
        aggregatedWeights[layerName] = new Array((weights as number[]).length).fill(0);
      }
    }

    // Weighted averaging
    for (const update of updates) {
      const weight = update.numSamples / totalSamples;

      for (const [layerName, weights] of Object.entries(update.weights)) {
        if (Array.isArray(weights[0])) {
          // 2D array
          const aggLayer = aggregatedWeights[layerName] as number[][];
          const updateLayer = weights as number[][];

          for (let i = 0; i < updateLayer.length; i++) {
            for (let j = 0; j < updateLayer[i].length; j++) {
              aggLayer[i][j] += updateLayer[i][j] * weight;
            }
          }
        } else {
          // 1D array
          const aggLayer = aggregatedWeights[layerName] as number[];
          const updateLayer = weights as number[];

          for (let i = 0; i < updateLayer.length; i++) {
            aggLayer[i] += updateLayer[i] * weight;
          }
        }
      }
    }

    // Calculate metrics
    const averageLoss = updates.reduce((sum, u) => sum + u.loss * u.numSamples, 0) / totalSamples;
    const averageAccuracy = updates.every((u) => u.accuracy !== undefined)
      ? updates.reduce((sum, u) => sum + (u.accuracy ?? 0) * u.numSamples, 0) / totalSamples
      : undefined;

    const metrics: RoundMetrics = {
      totalClients: updates.length,
      participatingClients: updates.length,
      averageLoss,
      averageAccuracy,
      aggregationTime: 0, // Will be set by orchestrator
      communicationCost: this.calculateCommunicationCost(updates),
    };

    return {
      aggregatedWeights,
      participatingClients: updates.map((u) => u.clientId),
      totalSamples,
      metrics,
    };
  }

  /**
   * Calculate communication cost (total data transferred)
   */
  private calculateCommunicationCost(updates: ClientUpdate[]): number {
    let totalParams = 0;

    for (const update of updates) {
      for (const weights of Object.values(update.weights)) {
        if (Array.isArray(weights[0])) {
          // 2D array
          totalParams += (weights as number[][]).reduce((sum, row) => sum + row.length, 0);
        } else {
          // 1D array
          totalParams += (weights as number[]).length;
        }
      }
    }

    // Assume 4 bytes per float32 parameter
    return totalParams * 4;
  }
}
