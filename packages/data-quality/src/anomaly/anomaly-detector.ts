/**
 * Data anomaly detection and alerting system
 */

import { Pool } from 'pg';
import {
  DataAnomaly,
  AnomalyType,
  AffectedData,
  DataProfile,
} from '../types.js';

export class AnomalyDetector {
  constructor(private pool: Pool) {}

  /**
   * Detect anomalies in dataset
   */
  async detectAnomalies(
    datasetId: string,
    currentProfile: DataProfile,
    historicalProfiles: DataProfile[]
  ): Promise<DataAnomaly[]> {
    const anomalies: DataAnomaly[] = [];

    // Volume anomaly detection
    const volumeAnomalies = this.detectVolumeAnomalies(datasetId, currentProfile, historicalProfiles);
    anomalies.push(...volumeAnomalies);

    // Quality degradation detection
    const qualityAnomalies = this.detectQualityDegradation(datasetId, currentProfile, historicalProfiles);
    anomalies.push(...qualityAnomalies);

    // Pattern deviation detection
    const patternAnomalies = this.detectPatternDeviations(datasetId, currentProfile, historicalProfiles);
    anomalies.push(...patternAnomalies);

    // Statistical outlier detection
    const statisticalAnomalies = this.detectStatisticalOutliers(datasetId, currentProfile);
    anomalies.push(...statisticalAnomalies);

    return anomalies;
  }

  private detectVolumeAnomalies(
    datasetId: string,
    current: DataProfile,
    historical: DataProfile[]
  ): DataAnomaly[] {
    if (historical.length === 0) return [];

    const avgRows = historical.reduce((sum, p) => sum + p.totalRows, 0) / historical.length;
    const stdDev = this.calculateStdDev(historical.map(p => p.totalRows));
    const threshold = 2; // 2 standard deviations

    const anomalies: DataAnomaly[] = [];

    if (current.totalRows > avgRows + threshold * stdDev) {
      anomalies.push({
        id: this.generateId(),
        datasetId,
        type: 'volume-spike',
        severity: 'high',
        description: `Unusual volume spike detected: ${current.totalRows} rows (avg: ${avgRows.toFixed(0)})`,
        detectedAt: new Date(),
        affectedData: {
          tableName: datasetId,
          rowCount: current.totalRows,
        },
        confidence: 0.85,
        suggestedAction: 'Investigate data ingestion pipeline for unexpected data sources',
      });
    }

    if (current.totalRows < avgRows - threshold * stdDev && current.totalRows > 0) {
      anomalies.push({
        id: this.generateId(),
        datasetId,
        type: 'volume-drop',
        severity: 'high',
        description: `Unusual volume drop detected: ${current.totalRows} rows (avg: ${avgRows.toFixed(0)})`,
        detectedAt: new Date(),
        affectedData: {
          tableName: datasetId,
          rowCount: current.totalRows,
        },
        confidence: 0.85,
        suggestedAction: 'Check data ingestion pipeline for failures or data source issues',
      });
    }

    return anomalies;
  }

  private detectQualityDegradation(
    datasetId: string,
    current: DataProfile,
    historical: DataProfile[]
  ): DataAnomaly[] {
    if (historical.length === 0) return [];

    const anomalies: DataAnomaly[] = [];
    const avgCompleteness = historical.reduce((sum, p) => sum + p.completeness, 0) / historical.length;
    const avgValidity = historical.reduce((sum, p) => sum + p.validity, 0) / historical.length;

    // Completeness degradation
    if (current.completeness < avgCompleteness - 10) {
      anomalies.push({
        id: this.generateId(),
        datasetId,
        type: 'quality-degradation',
        severity: 'medium',
        description: `Completeness degraded: ${current.completeness.toFixed(2)}% (avg: ${avgCompleteness.toFixed(2)}%)`,
        detectedAt: new Date(),
        affectedData: {
          tableName: datasetId,
          columnNames: [current.columnName],
        },
        confidence: 0.8,
        suggestedAction: 'Review data collection processes for missing data issues',
      });
    }

    // Validity degradation
    if (current.validity < avgValidity - 10) {
      anomalies.push({
        id: this.generateId(),
        datasetId,
        type: 'quality-degradation',
        severity: 'medium',
        description: `Validity degraded: ${current.validity.toFixed(2)}% (avg: ${avgValidity.toFixed(2)}%)`,
        detectedAt: new Date(),
        affectedData: {
          tableName: datasetId,
          columnNames: [current.columnName],
        },
        confidence: 0.8,
        suggestedAction: 'Check validation rules and data source quality',
      });
    }

    return anomalies;
  }

  private detectPatternDeviations(
    datasetId: string,
    current: DataProfile,
    historical: DataProfile[]
  ): DataAnomaly[] {
    if (historical.length === 0 || current.patterns.length === 0) return [];

    const anomalies: DataAnomaly[] = [];

    // Check for significant changes in pattern distribution
    const historicalPatterns = historical[historical.length - 1].patterns;
    if (historicalPatterns.length === 0) return [];

    for (const currentPattern of current.patterns.slice(0, 5)) {
      const historicalPattern = historicalPatterns.find(p => p.pattern === currentPattern.pattern);

      if (historicalPattern) {
        const percentageChange = Math.abs(currentPattern.percentage - historicalPattern.percentage);

        if (percentageChange > 20) {
          anomalies.push({
            id: this.generateId(),
            datasetId,
            type: 'pattern-deviation',
            severity: 'low',
            description: `Pattern "${currentPattern.pattern}" deviation: ${percentageChange.toFixed(2)}% change`,
            detectedAt: new Date(),
            affectedData: {
              tableName: datasetId,
              columnNames: [current.columnName],
            },
            confidence: 0.7,
            suggestedAction: 'Review data source for pattern changes',
          });
        }
      }
    }

    return anomalies;
  }

  private detectStatisticalOutliers(
    datasetId: string,
    profile: DataProfile
  ): DataAnomaly[] {
    const anomalies: DataAnomaly[] = [];

    if (!profile.statistics.mean || !profile.statistics.standardDeviation) {
      return [];
    }

    const { mean, standardDeviation, min, max } = profile.statistics;

    // Check if min/max are beyond 3 standard deviations (outliers)
    const lowerBound = mean - 3 * standardDeviation;
    const upperBound = mean + 3 * standardDeviation;

    if (typeof min === 'number' && min < lowerBound) {
      anomalies.push({
        id: this.generateId(),
        datasetId,
        type: 'statistical-outlier',
        severity: 'low',
        description: `Statistical outlier detected: minimum value ${min} is below expected range`,
        detectedAt: new Date(),
        affectedData: {
          tableName: datasetId,
          columnNames: [profile.columnName],
        },
        confidence: 0.75,
        suggestedAction: 'Review extreme values for data entry errors',
      });
    }

    if (typeof max === 'number' && max > upperBound) {
      anomalies.push({
        id: this.generateId(),
        datasetId,
        type: 'statistical-outlier',
        severity: 'low',
        description: `Statistical outlier detected: maximum value ${max} is above expected range`,
        detectedAt: new Date(),
        affectedData: {
          tableName: datasetId,
          columnNames: [profile.columnName],
        },
        confidence: 0.75,
        suggestedAction: 'Review extreme values for data entry errors',
      });
    }

    return anomalies;
  }

  /**
   * Detect schema drift
   */
  async detectSchemaDrift(
    tableName: string,
    expectedSchema: Record<string, string>
  ): Promise<DataAnomaly[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
      `;

      const result = await client.query(query, [tableName]);
      const currentSchema: Record<string, string> = {};

      result.rows.forEach((row: any) => {
        currentSchema[row.column_name] = row.data_type;
      });

      const anomalies: DataAnomaly[] = [];

      // Check for missing columns
      for (const [colName, colType] of Object.entries(expectedSchema)) {
        if (!currentSchema[colName]) {
          anomalies.push({
            id: this.generateId(),
            datasetId: tableName,
            type: 'schema-drift',
            severity: 'critical',
            description: `Column "${colName}" is missing from schema`,
            detectedAt: new Date(),
            affectedData: {
              tableName,
              columnNames: [colName],
            },
            confidence: 1.0,
            suggestedAction: 'Restore missing column or update schema expectations',
          });
        }
      }

      // Check for type changes
      for (const [colName, colType] of Object.entries(currentSchema)) {
        if (expectedSchema[colName] && expectedSchema[colName] !== colType) {
          anomalies.push({
            id: this.generateId(),
            datasetId: tableName,
            type: 'schema-drift',
            severity: 'high',
            description: `Column "${colName}" type changed from ${expectedSchema[colName]} to ${colType}`,
            detectedAt: new Date(),
            affectedData: {
              tableName,
              columnNames: [colName],
            },
            confidence: 1.0,
            suggestedAction: 'Review schema migration and data compatibility',
          });
        }
      }

      return anomalies;
    } finally {
      client.release();
    }
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  private generateId(): string {
    return `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
