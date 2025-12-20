import pino from 'pino';
import type { DigitalTwin, TwinStateVector } from '../types/index.js';

const logger = pino({ name: 'StateEstimator' });

interface EstimationResult {
  properties: Record<string, unknown>;
  derived: Record<string, unknown>;
  confidence: number;
}

/**
 * Quantum-inspired State Estimator
 * Uses ensemble methods and Bayesian inference for state estimation
 */
export class StateEstimator {
  private priorWeight = 0.3;
  private observationWeight = 0.7;

  /**
   * Estimate the new state given observations
   * Uses Kalman-like filtering with confidence weighting
   */
  async estimate(
    twin: DigitalTwin,
    observations: Record<string, unknown>,
    observationConfidence: number,
  ): Promise<EstimationResult> {
    const prior = twin.currentStateVector;
    const priorConfidence = prior.confidence;

    // Bayesian confidence update
    const combinedConfidence = this.bayesianConfidenceUpdate(
      priorConfidence,
      observationConfidence,
    );

    // Merge state properties with confidence weighting
    const mergedProperties = this.mergeProperties(
      prior.properties,
      observations,
      priorConfidence,
      observationConfidence,
    );

    // Derive computed properties
    const derived = await this.computeDerivedProperties(mergedProperties, twin);

    // Anomaly detection
    const anomalies = this.detectAnomalies(prior.properties, mergedProperties);
    if (anomalies.length > 0) {
      logger.warn({ twinId: twin.metadata.id, anomalies }, 'State anomalies detected');
    }

    return {
      properties: mergedProperties,
      derived,
      confidence: combinedConfidence,
    };
  }

  private bayesianConfidenceUpdate(
    priorConfidence: number,
    observationConfidence: number,
  ): number {
    // Simplified Bayesian update
    const combined =
      (priorConfidence * this.priorWeight +
        observationConfidence * this.observationWeight) /
      (this.priorWeight + this.observationWeight);

    // Apply decay for uncertainty
    return Math.min(1, combined * 0.98 + 0.02);
  }

  private mergeProperties(
    prior: Record<string, unknown>,
    observations: Record<string, unknown>,
    priorConf: number,
    obsConf: number,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...prior };
    const totalWeight = priorConf * this.priorWeight + obsConf * this.observationWeight;

    for (const [key, value] of Object.entries(observations)) {
      const priorValue = prior[key];

      if (typeof value === 'number' && typeof priorValue === 'number') {
        // Weighted average for numeric values
        result[key] =
          (priorValue * priorConf * this.priorWeight +
            value * obsConf * this.observationWeight) /
          totalWeight;
      } else {
        // For non-numeric, prefer observation if confidence is higher
        result[key] = obsConf >= priorConf ? value : priorValue;
      }
    }

    return result;
  }

  private async computeDerivedProperties(
    properties: Record<string, unknown>,
    twin: DigitalTwin,
  ): Promise<Record<string, unknown>> {
    const derived: Record<string, unknown> = {};

    // Compute velocity/rate of change for numeric properties
    if (twin.stateHistory.length > 0) {
      const lastState = twin.stateHistory[twin.stateHistory.length - 1];
      const timeDelta =
        (Date.now() - new Date(lastState.timestamp).getTime()) / 1000;

      if (timeDelta > 0) {
        for (const [key, value] of Object.entries(properties)) {
          const lastValue = lastState.properties[key];
          if (typeof value === 'number' && typeof lastValue === 'number') {
            derived[`${key}_velocity`] = (value - lastValue) / timeDelta;
          }
        }
      }
    }

    // Compute aggregate metrics
    derived['_stateAge'] = twin.stateHistory.length;
    derived['_lastUpdateDelta'] =
      Date.now() - new Date(twin.currentStateVector.timestamp).getTime();

    return derived;
  }

  private detectAnomalies(
    prior: Record<string, unknown>,
    current: Record<string, unknown>,
  ): string[] {
    const anomalies: string[] = [];
    const threshold = 0.5; // 50% change threshold

    for (const [key, value] of Object.entries(current)) {
      const priorValue = prior[key];
      if (typeof value === 'number' && typeof priorValue === 'number' && priorValue !== 0) {
        const changeRatio = Math.abs(value - priorValue) / Math.abs(priorValue);
        if (changeRatio > threshold) {
          anomalies.push(`${key}: ${(changeRatio * 100).toFixed(1)}% change`);
        }
      }
    }

    return anomalies;
  }
}
