import { sampleCorrelation } from 'simple-statistics';
import pino from 'pino';

import type { EntanglementSignature } from '../models/EntanglementSignature.js';
import { createEntanglementSignature } from '../models/EntanglementSignature.js';
import type { TimeSeriesData } from './LatentCouplingFinder.js';

const logger = pino({ name: 'CrossDomainCorrelator' });

export interface DomainMetrics {
  domain: string;
  systemId: string;
  metricType: string;
  timeSeries: TimeSeriesData;
}

export interface DomainDistance {
  domain1: string;
  domain2: string;
  architecturalDistance: number;
  semanticDistance: number;
  operationalDistance: number;
  overallDistance: number;
}

export interface CrossDomainCorrelation {
  system1: { domain: string; systemId: string };
  system2: { domain: string; systemId: string };
  correlation: number;
  significance: number;
  crossDomainScore: number;
  isUnexpected: boolean;
}

export class CrossDomainCorrelator {
  private minCorrelation: number;
  private minCrossDomainScore: number;
  private knownDependencies: Set<string>;

  constructor(config: {
    minCorrelation?: number;
    minCrossDomainScore?: number;
    knownDependencies?: Array<[string, string]>;
  } = {}) {
    this.minCorrelation = config.minCorrelation ?? 0.7;
    this.minCrossDomainScore = config.minCrossDomainScore ?? 0.5;
    this.knownDependencies = new Set(
      (config.knownDependencies || []).map(([a, b]) => `${a}-${b}`),
    );
  }

  /**
   * Discover cross-domain correlations
   */
  async discoverCorrelations(
    domainMetrics: DomainMetrics[],
  ): Promise<EntanglementSignature[]> {
    logger.info(
      { metricsCount: domainMetrics.length },
      'Starting cross-domain correlation discovery',
    );

    // Group metrics by domain
    const domainGroups = this.groupByDomain(domainMetrics);

    const correlations: CrossDomainCorrelation[] = [];

    // Find correlations between different domains
    const domains = Array.from(domainGroups.keys());

    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const domain1 = domains[i];
        const domain2 = domains[j];

        const domainCorrelations = await this.correlateDomainPair(
          domain1,
          domain2,
          domainGroups.get(domain1)!,
          domainGroups.get(domain2)!,
        );

        correlations.push(...domainCorrelations);
      }
    }

    // Filter and prioritize unexpected correlations
    const unexpected = this.filterUnexpectedCorrelations(correlations);

    // Convert to entanglement signatures
    const signatures = this.convertToSignatures(unexpected);

    logger.info(
      { signaturesFound: signatures.length },
      'Cross-domain correlation discovery complete',
    );

    return signatures;
  }

  /**
   * Group metrics by domain
   */
  private groupByDomain(
    domainMetrics: DomainMetrics[],
  ): Map<string, DomainMetrics[]> {
    const groups = new Map<string, DomainMetrics[]>();

    for (const metric of domainMetrics) {
      const domainMetricsList = groups.get(metric.domain) || [];
      domainMetricsList.push(metric);
      groups.set(metric.domain, domainMetricsList);
    }

    return groups;
  }

  /**
   * Correlate metrics between two domains
   */
  private async correlateDomainPair(
    domain1: string,
    domain2: string,
    metrics1: DomainMetrics[],
    metrics2: DomainMetrics[],
  ): Promise<CrossDomainCorrelation[]> {
    const correlations: CrossDomainCorrelation[] = [];

    for (const m1 of metrics1) {
      for (const m2 of metrics2) {
        const correlation = this.computeCorrelation(
          m1.timeSeries,
          m2.timeSeries,
        );

        if (correlation.correlation >= this.minCorrelation) {
          const distance = this.calculateDomainDistance(domain1, domain2);
          const crossDomainScore = correlation.correlation * distance.overallDistance;

          if (crossDomainScore >= this.minCrossDomainScore) {
            const isUnexpected = this.isUnexpectedCorrelation(
              m1.systemId,
              m2.systemId,
            );

            correlations.push({
              system1: { domain: domain1, systemId: m1.systemId },
              system2: { domain: domain2, systemId: m2.systemId },
              correlation: correlation.correlation,
              significance: correlation.significance,
              crossDomainScore,
              isUnexpected,
            });
          }
        }
      }
    }

    return correlations;
  }

  /**
   * Compute correlation between two time series
   */
  private computeCorrelation(
    ts1: TimeSeriesData,
    ts2: TimeSeriesData,
  ): { correlation: number; significance: number } {
    // Align time series
    const aligned = this.alignTimeSeries(ts1, ts2);

    if (aligned.values1.length < 30) {
      return { correlation: 0, significance: 0 };
    }

    try {
      const correlation = sampleCorrelation(aligned.values1, aligned.values2);
      const significance = this.calculateSignificance(
        correlation,
        aligned.values1.length,
      );

      return { correlation: Math.abs(correlation), significance };
    } catch (error) {
      return { correlation: 0, significance: 0 };
    }
  }

  /**
   * Align two time series
   */
  private alignTimeSeries(
    ts1: TimeSeriesData,
    ts2: TimeSeriesData,
  ): { values1: number[]; values2: number[] } {
    const values1: number[] = [];
    const values2: number[] = [];

    let i = 0;
    let j = 0;

    const tolerance = 1000; // 1 second

    while (i < ts1.timestamps.length && j < ts2.timestamps.length) {
      const t1 = ts1.timestamps[i];
      const t2 = ts2.timestamps[j];

      if (Math.abs(t1 - t2) <= tolerance) {
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

    return { values1, values2 };
  }

  /**
   * Calculate statistical significance
   */
  private calculateSignificance(r: number, n: number): number {
    if (n < 3) {
      return 0;
    }

    // Fisher's z-transform
    const z = 0.5 * Math.log((1 + Math.abs(r)) / (1 - Math.abs(r)));
    const se = 1 / Math.sqrt(n - 3);
    const zScore = z / se;

    // Convert to confidence (1 - p-value)
    return 1 - 2 * (1 - this.standardNormalCDF(Math.abs(zScore)));
  }

  /**
   * Standard normal CDF
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
   * Calculate distance between two domains
   */
  private calculateDomainDistance(domain1: string, domain2: string): DomainDistance {
    // Simplified distance calculation
    // Production would use actual architecture graph and semantic analysis

    const architecturalDistance = this.calculateArchitecturalDistance(
      domain1,
      domain2,
    );
    const semanticDistance = this.calculateSemanticDistance(domain1, domain2);
    const operationalDistance = this.calculateOperationalDistance(
      domain1,
      domain2,
    );

    // Weighted average
    const overallDistance =
      architecturalDistance * 0.4 +
      semanticDistance * 0.4 +
      operationalDistance * 0.2;

    return {
      domain1,
      domain2,
      architecturalDistance,
      semanticDistance,
      operationalDistance,
      overallDistance,
    };
  }

  /**
   * Calculate architectural distance (hops in deployment diagram)
   */
  private calculateArchitecturalDistance(domain1: string, domain2: string): number {
    // Simplified: use domain name similarity as proxy
    // Production would query actual architecture graph

    const domainHierarchy: Record<string, string[]> = {
      database: ['neo4j', 'postgresql', 'redis'],
      compute: ['api', 'worker', 'analytics'],
      network: ['gateway', 'proxy', 'cdn'],
      application: ['web', 'mobile', 'copilot'],
      'machine-learning': ['ml-pipeline', 'feature-store', 'model-server'],
    };

    let distance = 1.0; // Maximum distance

    for (const [category, domains] of Object.entries(domainHierarchy)) {
      const in1 = domains.some((d) => domain1.includes(d));
      const in2 = domains.some((d) => domain2.includes(d));

      if (in1 && in2) {
        distance = 0.3; // Same category
        break;
      } else if (in1 || in2) {
        distance = Math.min(distance, 0.7); // Adjacent categories
      }
    }

    return distance;
  }

  /**
   * Calculate semantic distance using simple string similarity
   */
  private calculateSemanticDistance(domain1: string, domain2: string): number {
    // Simplified: Jaccard similarity of domain name tokens
    const tokens1 = new Set(domain1.toLowerCase().split(/[-_]/));
    const tokens2 = new Set(domain2.toLowerCase().split(/[-_]/));

    const intersection = new Set(
      [...tokens1].filter((token) => tokens2.has(token)),
    );
    const union = new Set([...tokens1, ...tokens2]);

    const similarity = intersection.size / union.size;
    return 1 - similarity; // Distance is inverse of similarity
  }

  /**
   * Calculate operational distance (different teams/SLOs)
   */
  private calculateOperationalDistance(domain1: string, domain2: string): number {
    // Simplified: assume domains with different prefixes are different teams
    const prefix1 = domain1.split('-')[0];
    const prefix2 = domain2.split('-')[0];

    return prefix1 === prefix2 ? 0.3 : 1.0;
  }

  /**
   * Check if correlation is unexpected (not a known dependency)
   */
  private isUnexpectedCorrelation(system1: string, system2: string): boolean {
    const key1 = `${system1}-${system2}`;
    const key2 = `${system2}-${system1}`;

    return !this.knownDependencies.has(key1) && !this.knownDependencies.has(key2);
  }

  /**
   * Filter and prioritize unexpected correlations
   */
  private filterUnexpectedCorrelations(
    correlations: CrossDomainCorrelation[],
  ): CrossDomainCorrelation[] {
    return correlations
      .filter((c) => c.isUnexpected)
      .sort((a, b) => b.crossDomainScore - a.crossDomainScore)
      .slice(0, 100); // Top 100
  }

  /**
   * Convert cross-domain correlations to entanglement signatures
   */
  private convertToSignatures(
    correlations: CrossDomainCorrelation[],
  ): EntanglementSignature[] {
    return correlations.map((correlation) => {
      return createEntanglementSignature(
        [correlation.system1.systemId, correlation.system2.systemId],
        correlation.correlation,
        0, // Cross-domain correlations typically have minimal lag
        'DATA_LINEAGE', // Default to data lineage type for cross-domain
        correlation.significance,
        {
          correlationCoefficient: correlation.correlation,
          lagTime: 0,
          observationWindow: 300000,
          sampleCount: 100, // Estimated
        },
      );
    });
  }

  /**
   * Perform Granger causality test
   */
  async grangerCausalityTest(
    ts1: TimeSeriesData,
    ts2: TimeSeriesData,
    maxLag: number = 10,
  ): Promise<{ causal: boolean; direction: 'forward' | 'reverse' | 'none' }> {
    // Simplified Granger causality test
    // Production would use proper statistical library

    const aligned = this.alignTimeSeries(ts1, ts2);

    if (aligned.values1.length < maxLag + 30) {
      return { causal: false, direction: 'none' };
    }

    // Test if ts1 Granger-causes ts2
    const forwardScore = this.grangerScore(aligned.values1, aligned.values2, maxLag);

    // Test if ts2 Granger-causes ts1
    const reverseScore = this.grangerScore(aligned.values2, aligned.values1, maxLag);

    const threshold = 0.1; // Improvement threshold

    if (forwardScore > threshold && forwardScore > reverseScore) {
      return { causal: true, direction: 'forward' };
    } else if (reverseScore > threshold && reverseScore > forwardScore) {
      return { causal: true, direction: 'reverse' };
    } else {
      return { causal: false, direction: 'none' };
    }
  }

  /**
   * Calculate Granger score (simplified)
   */
  private grangerScore(
    cause: number[],
    effect: number[],
    maxLag: number,
  ): number {
    // Simplified: measure if adding lagged cause improves prediction of effect
    // This is a placeholder - production would use proper regression

    const predictions: number[] = [];

    for (let i = maxLag; i < effect.length; i++) {
      // Simple autoregressive prediction
      let pred = 0;
      for (let lag = 1; lag <= maxLag; lag++) {
        pred += effect[i - lag] / maxLag;
      }
      predictions.push(pred);
    }

    // Calculate prediction error
    const errors = predictions.map((pred, idx) => {
      return Math.abs(pred - effect[maxLag + idx]);
    });

    const baselineError = errors.reduce((a, b) => a + b, 0) / errors.length;

    // Now try with cause included
    const predictionsWithCause: number[] = [];

    for (let i = maxLag; i < effect.length; i++) {
      let pred = 0;
      for (let lag = 1; lag <= maxLag; lag++) {
        pred += (effect[i - lag] + cause[i - lag]) / (2 * maxLag);
      }
      predictionsWithCause.push(pred);
    }

    const errorsWithCause = predictionsWithCause.map((pred, idx) => {
      return Math.abs(pred - effect[maxLag + idx]);
    });

    const improvedError =
      errorsWithCause.reduce((a, b) => a + b, 0) / errorsWithCause.length;

    // Improvement score
    return Math.max(0, (baselineError - improvedError) / baselineError);
  }
}
