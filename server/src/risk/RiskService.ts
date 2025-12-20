import { FeatureStore } from './FeatureStore';
import { RiskEngine, RiskResult } from './RiskEngine';
import { verifyWeights } from './WeightsVerifier';
import path from 'path';

const modelsDir = path.join(__dirname, '..', '..', 'models');
const weightsPath = path.join(modelsDir, 'weights.json');
const checksums = require(path.join(modelsDir, 'checksums.json'));

/**
 * Service wrapper for risk computation.
 * Loads verified model weights, retrieves features, and executes the risk engine.
 */
export class RiskService {
  private engine: RiskEngine;
  private store = new FeatureStore();

  /**
   * Initializes the RiskService.
   * Loads and verifies model weights from the file system upon instantiation.
   */
  constructor() {
    const data = verifyWeights(weightsPath, checksums['weights.json']);
    this.engine = new RiskEngine(data.weights, data.bias, data.version || 'v1');
  }

  /**
   * Computes the risk score for a single entity.
   *
   * @param entityId - The ID of the entity to score.
   * @param window - The time window for feature aggregation.
   * @returns A promise resolving to the RiskResult.
   */
  async compute(
    entityId: string,
    window: '24h' | '7d' | '30d',
  ): Promise<RiskResult> {
    const features = await this.store.getFeatures(entityId, window);
    return this.engine.score(features, window);
  }

  /**
   * Batches risk computation for multiple entities.
   *
   * @param entityIds - An array of entity IDs.
   * @param window - The time window for feature aggregation.
   * @returns A promise resolving to an array of RiskResults.
   */
  async recomputeBatch(
    entityIds: string[],
    window: '24h' | '7d' | '30d',
  ): Promise<RiskResult[]> {
    const results: RiskResult[] = [];
    for (const id of entityIds) {
      results.push(await this.compute(id, window));
    }
    return results;
  }
}
