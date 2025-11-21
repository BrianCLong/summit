/**
 * KAnonymity - Implement k-anonymity, l-diversity, and t-closeness
 */

import { TabularData } from '@intelgraph/synthetic-data';

export interface AnonymizationConfig {
  k: number; // k-anonymity parameter
  l?: number; // l-diversity parameter
  t?: number; // t-closeness parameter
  quasiIdentifiers: string[]; // Columns that are quasi-identifiers
  sensitiveAttributes?: string[]; // Sensitive columns
  suppressionThreshold?: number; // Max percentage of records to suppress
}

export interface AnonymizationResult {
  anonymizedData: TabularData;
  metrics: AnonymizationMetrics;
  warnings: string[];
}

export interface AnonymizationMetrics {
  kAnonymity: number;
  lDiversity?: number;
  tCloseness?: number;
  suppressedRecords: number;
  generalizedCells: number;
  informationLoss: number;
}

export interface EquivalenceClass {
  records: any[][];
  size: number;
  quasiIdentifierValues: any[];
}

/**
 * K-Anonymity implementation
 */
export class KAnonymity {
  private config: AnonymizationConfig;

  constructor(config: AnonymizationConfig) {
    this.config = config;
  }

  /**
   * Anonymize data to achieve k-anonymity
   */
  anonymize(data: TabularData): AnonymizationResult {
    const warnings: string[] = [];

    // Create equivalence classes
    let equivalenceClasses = this.createEquivalenceClasses(data);

    // Identify and handle small equivalence classes
    const smallClasses = equivalenceClasses.filter(ec => ec.size < this.config.k);

    if (smallClasses.length > 0) {
      warnings.push(`Found ${smallClasses.length} equivalence classes smaller than k=${this.config.k}`);
    }

    // Apply generalization and suppression
    const { anonymized, metrics } = this.applyAnonymization(data, equivalenceClasses);

    // Verify k-anonymity
    const actualK = this.verifyKAnonymity(anonymized);
    metrics.kAnonymity = actualK;

    if (actualK < this.config.k) {
      warnings.push(`Achieved k=${actualK}, which is less than target k=${this.config.k}`);
    }

    // Check l-diversity if configured
    if (this.config.l && this.config.sensitiveAttributes) {
      const lDiv = this.verifyLDiversity(anonymized);
      metrics.lDiversity = lDiv;

      if (lDiv < this.config.l) {
        warnings.push(`Achieved l=${lDiv}, which is less than target l=${this.config.l}`);
      }
    }

    // Check t-closeness if configured
    if (this.config.t && this.config.sensitiveAttributes) {
      const tClose = this.verifyTCloseness(anonymized, data);
      metrics.tCloseness = tClose;

      if (tClose > this.config.t) {
        warnings.push(`Achieved t=${tClose}, which is greater than target t=${this.config.t}`);
      }
    }

    return {
      anonymizedData: anonymized,
      metrics,
      warnings
    };
  }

  /**
   * Create equivalence classes based on quasi-identifiers
   */
  private createEquivalenceClasses(data: TabularData): EquivalenceClass[] {
    const { quasiIdentifiers } = this.config;
    const classMap = new Map<string, any[][]>();

    // Get indices of quasi-identifier columns
    const qiIndices = quasiIdentifiers.map(qi => data.columns.indexOf(qi));

    // Group records by quasi-identifier values
    data.data.forEach(record => {
      const qiValues = qiIndices.map(idx => record[idx]);
      const key = JSON.stringify(qiValues);

      if (!classMap.has(key)) {
        classMap.set(key, []);
      }
      classMap.get(key)!.push(record);
    });

    // Convert to equivalence classes
    const classes: EquivalenceClass[] = [];
    classMap.forEach((records, key) => {
      const qiValues = JSON.parse(key);
      classes.push({
        records,
        size: records.length,
        quasiIdentifierValues: qiValues
      });
    });

    return classes;
  }

  /**
   * Apply generalization and suppression to achieve k-anonymity
   */
  private applyAnonymization(
    data: TabularData,
    equivalenceClasses: EquivalenceClass[]
  ): { anonymized: TabularData; metrics: AnonymizationMetrics } {
    const anonymizedRecords: any[][] = [];
    let suppressedCount = 0;
    let generalizedCount = 0;

    // Sort classes by size
    const sortedClasses = [...equivalenceClasses].sort((a, b) => a.size - b.size);

    for (const ec of sortedClasses) {
      if (ec.size >= this.config.k) {
        // Class is already k-anonymous, keep as is
        anonymizedRecords.push(...ec.records);
      } else {
        // Try to generalize or suppress
        const shouldSuppress = this.shouldSuppress(ec, data);

        if (shouldSuppress) {
          // Suppress these records
          suppressedCount += ec.size;
        } else {
          // Generalize quasi-identifiers
          const generalized = this.generalizeRecords(ec, data);
          anonymizedRecords.push(...generalized);
          generalizedCount += ec.size * this.config.quasiIdentifiers.length;
        }
      }
    }

    // Compute information loss
    const informationLoss = this.computeInformationLoss(data, {
      columns: data.columns,
      data: anonymizedRecords
    });

    return {
      anonymized: {
        columns: data.columns,
        data: anonymizedRecords,
        metadata: data.metadata
      },
      metrics: {
        kAnonymity: 0, // Will be computed later
        suppressedRecords: suppressedCount,
        generalizedCells: generalizedCount,
        informationLoss
      }
    };
  }

  /**
   * Determine if equivalence class should be suppressed
   */
  private shouldSuppress(ec: EquivalenceClass, data: TabularData): boolean {
    const suppressionThreshold = this.config.suppressionThreshold || 0.05;
    const maxSuppressed = data.data.length * suppressionThreshold;

    // Suppress if class is very small
    return ec.size < this.config.k / 2;
  }

  /**
   * Generalize records in equivalence class
   */
  private generalizeRecords(ec: EquivalenceClass, data: TabularData): any[][] {
    const qiIndices = this.config.quasiIdentifiers.map(qi => data.columns.indexOf(qi));

    return ec.records.map(record => {
      const generalized = [...record];

      // Generalize quasi-identifiers
      qiIndices.forEach(idx => {
        generalized[idx] = this.generalizeValue(record[idx], data.columns[idx]);
      });

      return generalized;
    });
  }

  /**
   * Generalize a single value
   */
  private generalizeValue(value: any, columnName: string): any {
    if (typeof value === 'number') {
      // Generalize numerical values to ranges
      const range = 10; // Fixed range for simplicity
      const lower = Math.floor(value / range) * range;
      return `${lower}-${lower + range}`;
    } else if (typeof value === 'string') {
      // Generalize strings by truncation or wildcarding
      if (value.length > 3) {
        return value.substring(0, 3) + '*';
      }
      return value;
    }

    return value;
  }

  /**
   * Verify k-anonymity of anonymized data
   */
  private verifyKAnonymity(data: TabularData): number {
    const classes = this.createEquivalenceClasses(data);
    const sizes = classes.map(ec => ec.size);
    return sizes.length > 0 ? Math.min(...sizes) : 0;
  }

  /**
   * Verify l-diversity of anonymized data
   */
  private verifyLDiversity(data: TabularData): number {
    if (!this.config.sensitiveAttributes || this.config.sensitiveAttributes.length === 0) {
      return 0;
    }

    const classes = this.createEquivalenceClasses(data);
    const sensitiveIdx = data.columns.indexOf(this.config.sensitiveAttributes[0]);

    let minDiversity = Infinity;

    for (const ec of classes) {
      // Count distinct sensitive values in this equivalence class
      const sensitiveValues = new Set(ec.records.map(r => r[sensitiveIdx]));
      minDiversity = Math.min(minDiversity, sensitiveValues.size);
    }

    return minDiversity === Infinity ? 0 : minDiversity;
  }

  /**
   * Verify t-closeness of anonymized data
   */
  private verifyTCloseness(anonymized: TabularData, original: TabularData): number {
    if (!this.config.sensitiveAttributes || this.config.sensitiveAttributes.length === 0) {
      return 0;
    }

    const classes = this.createEquivalenceClasses(anonymized);
    const sensitiveIdx = anonymized.columns.indexOf(this.config.sensitiveAttributes[0]);

    // Compute overall distribution
    const overallDist = this.computeDistribution(
      original.data.map(r => r[sensitiveIdx])
    );

    let maxDistance = 0;

    // Compute EMD (Earth Mover's Distance) for each equivalence class
    for (const ec of classes) {
      const classDist = this.computeDistribution(
        ec.records.map(r => r[sensitiveIdx])
      );

      const distance = this.earthMoversDistance(overallDist, classDist);
      maxDistance = Math.max(maxDistance, distance);
    }

    return maxDistance;
  }

  /**
   * Compute distribution of values
   */
  private computeDistribution(values: any[]): Map<any, number> {
    const dist = new Map<any, number>();
    const total = values.length;

    values.forEach(v => {
      dist.set(v, (dist.get(v) || 0) + 1 / total);
    });

    return dist;
  }

  /**
   * Compute Earth Mover's Distance between two distributions
   */
  private earthMoversDistance(dist1: Map<any, number>, dist2: Map<any, number>): number {
    // Simplified EMD computation
    const allKeys = new Set([...dist1.keys(), ...dist2.keys()]);
    let distance = 0;

    allKeys.forEach(key => {
      const p1 = dist1.get(key) || 0;
      const p2 = dist2.get(key) || 0;
      distance += Math.abs(p1 - p2);
    });

    return distance / 2;
  }

  /**
   * Compute information loss
   */
  private computeInformationLoss(original: TabularData, anonymized: TabularData): number {
    // Simplified information loss metric
    // Compare entropy before and after anonymization
    let totalLoss = 0;
    let numColumns = 0;

    original.columns.forEach((col, idx) => {
      const origValues = original.data.map(r => r[idx]);
      const anonValues = anonymized.data.map(r => r[idx]);

      const origEntropy = this.computeEntropy(origValues);
      const anonEntropy = this.computeEntropy(anonValues);

      const loss = origEntropy > 0 ? (origEntropy - anonEntropy) / origEntropy : 0;
      totalLoss += loss;
      numColumns++;
    });

    return numColumns > 0 ? totalLoss / numColumns : 0;
  }

  /**
   * Compute entropy of values
   */
  private computeEntropy(values: any[]): number {
    const dist = this.computeDistribution(values);
    let entropy = 0;

    dist.forEach(prob => {
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    });

    return entropy;
  }
}

export default KAnonymity;
