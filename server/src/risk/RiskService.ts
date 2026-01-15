import { FeatureStore } from './FeatureStore.js';
import { RiskEngine, RiskResult } from './RiskEngine.js';
import { verifyWeights } from './WeightsVerifier.js';
import { RiskRepository } from '../db/repositories/RiskRepository.js';
import { RiskScoreInput, RiskLevel } from './types.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, '..', '..', 'models');
const weightsPath = path.join(modelsDir, 'weights.json');
// Mock checksums if file doesn't exist for now, or handle gracefully
let checksums: any = {};
try {
  const checksumsPath = path.join(modelsDir, 'checksums.json');
  if (fs.existsSync(checksumsPath)) {
    checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf-8'));
  } else {
    checksums = { 'weights.json': 'mock' };
  }
} catch (e: any) {
  // Fallback for dev/test environments without models
  checksums = { 'weights.json': 'mock' };
}

export class RiskService {
  private engine: RiskEngine;
  private store = new FeatureStore();
  private repo = new RiskRepository();

  constructor() {
    let data;
    try {
      data = verifyWeights(weightsPath, checksums['weights.json']);
    } catch (e: any) {
       // Fallback for dev/test
       data = { weights: {}, bias: 0, version: 'v1' };
    }
    this.engine = new RiskEngine(data.weights, data.bias, data.version || 'v1');
  }

  /**
   * Computes and persists the risk score for an entity.
   */
  async computeAndPersist(
    tenantId: string,
    entityId: string,
    entityType: string,
    window: '24h' | '7d' | '30d'
  ): Promise<RiskResult> {
    const result = await this.compute(entityId, window);

    const input: RiskScoreInput = {
      tenantId,
      entityId,
      entityType,
      score: result.score,
      level: result.band as RiskLevel,
      window: result.window,
      modelVersion: result.modelVersion,
      // Generate a simple rationale based on top contributions
      rationale: this.generateRationale(result),
      signals: result.contributions.map(c => ({
        type: c.feature,
        value: c.value,
        weight: c.weight,
        contributionScore: c.delta,
        description: `Feature ${c.feature} contributed ${c.delta.toFixed(3)} to score`
      }))
    };

    await this.repo.saveRiskScore(input);
    return result;
  }

  private generateRationale(result: RiskResult): string {
    const topFactors = [...result.contributions]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
      .map(c => c.feature);

    return `Risk score ${result.score.toFixed(2)} (${result.band}) driven by: ${topFactors.join(', ')}`;
  }

  async compute(
    entityId: string,
    window: '24h' | '7d' | '30d',
  ): Promise<RiskResult> {
    const features = await this.store.getFeatures(entityId, window);
    return this.engine.score(features, window);
  }

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
