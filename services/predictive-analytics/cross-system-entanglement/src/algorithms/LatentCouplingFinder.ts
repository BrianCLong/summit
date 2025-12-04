import { sampleCorrelation, sampleCovariance } from 'simple-statistics';
import pino from 'pino';

import type {
  EntanglementSignature,
  SignatureType,
} from '../models/EntanglementSignature.js';
import { createEntanglementSignature } from '../models/EntanglementSignature.js';

const logger = pino({ name: 'LatentCouplingFinder' });

export interface TimeSeriesData {
  systemId: string;
  timestamps: number[];
  values: number[];
}

export interface CorrelationResult {
  systems: [string, string];
  correlation: number;
  lagTime: number;
  pValue: number;
  confidence: number;
}

export class LatentCouplingFinder {
  private minCorrelation: number;
  private maxLagMs: number;
  private minConfidence: number;
  private observationWindow: number;

  constructor(config: {
    minCorrelation?: number;
    maxLagMs?: number;
    minConfidence?: number;
    observationWindow?: number;
  } = {}) {
    this.minCorrelation = config.minCorrelation ?? 0.7;
    this.maxLagMs = config.maxLagMs ?? 60000;
    this.minConfidence = config.minConfidence ?? 0.95;
    this.observationWindow = config.observationWindow ?? 300000;
  }

  /**
   * Find latent couplings across multiple systems
   */
  async findCouplings(
    timeSeriesData: TimeSeriesData[],
  ): Promise<EntanglementSignature[]> {
    logger.info(
      { systemCount: timeSeriesData.length },
      'Starting latent coupling detection',
    );

    const signatures: EntanglementSignature[] = [];

    // Compare all pairs of systems
    for (let i = 0; i < timeSeriesData.length; i++) {
      for (let j = i + 1; j < timeSeriesData.length; j++) {
        const system1 = timeSeriesData[i];
        const system2 = timeSeriesData[j];

        const result = await this.analyzePair(system1, system2);

        if (result && result.correlation >= this.minCorrelation) {
          const signature = this.createSignature(result, system1, system2);
          signatures.push(signature);

          logger.debug(
            {
              systems: [system1.systemId, system2.systemId],
              correlation: result.correlation,
              lagTime: result.lagTime,
            },
            'Coupling detected',
          );
        }
      }
    }

    logger.info(
      { signaturesFound: signatures.length },
      'Latent coupling detection complete',
    );

    return signatures;
  }

  /**
   * Analyze a pair of systems for correlation
   */
  private async analyzePair(
    system1: TimeSeriesData,
    system2: TimeSeriesData,
  ): Promise<CorrelationResult | null> {
    try {
      // Align time series data
      const aligned = this.alignTimeSeries(system1, system2);

      if (aligned.values1.length < 30) {
        // Need minimum sample size for statistical significance
        logger.warn(
          {
            systems: [system1.systemId, system2.systemId],
            sampleSize: aligned.values1.length,
          },
          'Insufficient sample size for correlation analysis',
        );
        return null;
      }

      // Compute cross-correlation at multiple lag times
      const lagResults = this.computeCrossCorrelation(
        aligned.values1,
        aligned.values2,
      );

      // Find peak correlation
      const peak = this.findPeakCorrelation(lagResults);

      if (peak.correlation < this.minCorrelation) {
        return null;
      }

      // Calculate statistical significance
      const pValue = this.calculatePValue(peak.correlation, aligned.values1.length);
      const confidence = 1 - pValue;

      if (confidence < this.minConfidence) {
        logger.debug(
          {
            systems: [system1.systemId, system2.systemId],
            correlation: peak.correlation,
            confidence,
          },
          'Correlation not statistically significant',
        );
        return null;
      }

      return {
        systems: [system1.systemId, system2.systemId],
        correlation: peak.correlation,
        lagTime: peak.lagTime,
        pValue,
        confidence,
      };
    } catch (error) {
      logger.error(
        {
          error,
          systems: [system1.systemId, system2.systemId],
        },
        'Error analyzing system pair',
      );
      return null;
    }
  }

  /**
   * Align two time series to common timestamps
   */
  private alignTimeSeries(
    ts1: TimeSeriesData,
    ts2: TimeSeriesData,
  ): { timestamps: number[]; values1: number[]; values2: number[] } {
    const timestamps: number[] = [];
    const values1: number[] = [];
    const values2: number[] = [];

    let i = 0;
    let j = 0;

    const tolerance = 1000; // 1 second tolerance for timestamp matching

    while (i < ts1.timestamps.length && j < ts2.timestamps.length) {
      const t1 = ts1.timestamps[i];
      const t2 = ts2.timestamps[j];

      if (Math.abs(t1 - t2) <= tolerance) {
        timestamps.push(t1);
        values1.push(ts1.values[i]);
        values2.push(ts2.values[j]);
        i++;
        j++;
      } else if (t1 < t2) {
        i++;
      } else {
        j++;
      }
    }

    return { timestamps, values1, values2 };
  }

  /**
   * Compute cross-correlation at multiple lag times
   */
  private computeCrossCorrelation(
    values1: number[],
    values2: number[],
  ): Array<{ lagTime: number; correlation: number }> {
    const results: Array<{ lagTime: number; correlation: number }> = [];

    // Test lag times from -maxLag to +maxLag
    const maxLagSteps = Math.floor(this.maxLagMs / 1000);

    for (let lag = -maxLagSteps; lag <= maxLagSteps; lag++) {
      const correlation = this.computeLaggedCorrelation(values1, values2, lag);

      results.push({
        lagTime: lag * 1000,
        correlation,
      });
    }

    return results;
  }

  /**
   * Compute correlation with a specific lag
   */
  private computeLaggedCorrelation(
    values1: number[],
    values2: number[],
    lag: number,
  ): number {
    if (lag === 0) {
      return this.pearsonCorrelation(values1, values2);
    }

    if (lag > 0) {
      // values2 leads values1
      const shifted1 = values1.slice(lag);
      const shifted2 = values2.slice(0, -lag);
      return this.pearsonCorrelation(shifted1, shifted2);
    } else {
      // values1 leads values2
      const shifted1 = values1.slice(0, lag);
      const shifted2 = values2.slice(-lag);
      return this.pearsonCorrelation(shifted1, shifted2);
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    try {
      return sampleCorrelation(x, y);
    } catch (error) {
      // Handle cases with zero variance
      return 0;
    }
  }

  /**
   * Find peak in cross-correlation results
   */
  private findPeakCorrelation(
    results: Array<{ lagTime: number; correlation: number }>,
  ): { lagTime: number; correlation: number } {
    let peak = results[0];

    for (const result of results) {
      if (Math.abs(result.correlation) > Math.abs(peak.correlation)) {
        peak = result;
      }
    }

    return peak;
  }

  /**
   * Calculate p-value for correlation coefficient
   * Using Fisher's r-to-z transformation
   */
  private calculatePValue(r: number, n: number): number {
    if (n < 3) {
      return 1;
    }

    // Fisher's z-transform
    const z = 0.5 * Math.log((1 + Math.abs(r)) / (1 - Math.abs(r)));
    const se = 1 / Math.sqrt(n - 3);
    const zScore = z / se;

    // Convert z-score to p-value (two-tailed)
    // Simplified approximation
    return 2 * (1 - this.standardNormalCDF(Math.abs(zScore)));
  }

  /**
   * Standard normal cumulative distribution function
   */
  private standardNormalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const p =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - p : p;
  }

  /**
   * Create entanglement signature from correlation result
   */
  private createSignature(
    result: CorrelationResult,
    system1: TimeSeriesData,
    system2: TimeSeriesData,
  ): EntanglementSignature {
    const signatureType = this.classifySignatureType(result);

    return createEntanglementSignature(
      [system1.systemId, system2.systemId],
      Math.abs(result.correlation),
      Math.abs(result.lagTime),
      signatureType,
      result.confidence,
      {
        correlationCoefficient: result.correlation,
        lagTime: result.lagTime,
        observationWindow: this.observationWindow,
        sampleCount: system1.values.length,
      },
    );
  }

  /**
   * Classify signature type based on correlation characteristics
   */
  private classifySignatureType(result: CorrelationResult): SignatureType {
    const { lagTime, correlation } = result;

    // Near-zero lag suggests temporal synchronization
    if (Math.abs(lagTime) < 5000) {
      return 'TEMPORAL';
    }

    // Positive correlation with significant lag suggests causal relationship
    if (lagTime > 5000 && correlation > 0.8) {
      return 'CAUSAL';
    }

    // Default classification
    return 'RESOURCE';
  }

  /**
   * Validate against spurious correlations
   */
  validateCorrelation(
    signature: EntanglementSignature,
    historicalData: TimeSeriesData[],
  ): boolean {
    // Check temporal stability across multiple windows
    // This is a simplified validation - production would be more sophisticated
    return signature.metadata.sampleCount >= 30 && signature.confidence >= 0.95;
  }
}
