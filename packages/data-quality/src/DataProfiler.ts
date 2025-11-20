/**
 * Data profiler - analyzes datasets to generate statistical profiles
 */

import { Logger } from 'winston';

export interface ColumnProfile {
  name: string;
  dataType: string;
  nullCount: number;
  distinctCount: number;
  uniqueCount: number;
  min?: any;
  max?: any;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: Array<{ value: any; count: number; percentage: number }>;
  histogram?: Array<{ bin: string; count: number }>;
  completeness: number;
  uniqueness: number;
  examples: any[];
}

export interface DatasetProfile {
  tableName: string;
  rowCount: number;
  columnCount: number;
  totalSize: number;
  columns: ColumnProfile[];
  correlations?: Map<string, Map<string, number>>;
  profiledAt: Date;
  qualityScore: number;
}

export class DataProfiler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Profile a dataset
   */
  async profileDataset(data: any[], tableName?: string): Promise<DatasetProfile> {
    const startTime = Date.now();

    if (data.length === 0) {
      throw new Error('Cannot profile empty dataset');
    }

    this.logger.info(`Profiling dataset with ${data.length} records`);

    const columns = Object.keys(data[0]);
    const columnProfiles: ColumnProfile[] = [];

    // Profile each column
    for (const columnName of columns) {
      const profile = await this.profileColumn(data, columnName);
      columnProfiles.push(profile);
    }

    // Calculate overall quality score
    const qualityScore = this.calculateQualityScore(columnProfiles);

    const profile: DatasetProfile = {
      tableName: tableName || 'unknown',
      rowCount: data.length,
      columnCount: columns.length,
      totalSize: this.estimateDataSize(data),
      columns: columnProfiles,
      profiledAt: new Date(),
      qualityScore
    };

    const duration = Date.now() - startTime;
    this.logger.info(`Dataset profiling completed in ${duration}ms`, {
      rowCount: data.length,
      columnCount: columns.length,
      qualityScore
    });

    return profile;
  }

  /**
   * Profile a single column
   */
  async profileColumn(data: any[], columnName: string): Promise<ColumnProfile> {
    const values = data.map(row => row[columnName]);
    const nonNullValues = values.filter(v => v != null);

    const nullCount = values.length - nonNullValues.length;
    const uniqueValues = new Set(nonNullValues);
    const distinctCount = uniqueValues.size;

    // Determine data type
    const dataType = this.inferDataType(nonNullValues);

    // Calculate statistics based on data type
    let min, max, mean, median, stdDev;
    let topValues, histogram;

    if (dataType === 'number') {
      const numbers = nonNullValues.map(Number).filter(n => !isNaN(n));
      min = Math.min(...numbers);
      max = Math.max(...numbers);
      mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
      median = this.calculateMedian(numbers);
      stdDev = this.calculateStdDev(numbers, mean);
      histogram = this.generateHistogram(numbers);
    } else if (dataType === 'date') {
      const dates = nonNullValues.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        min = new Date(Math.min(...dates.map(d => d.getTime())));
        max = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    // Calculate top values
    topValues = this.calculateTopValues(nonNullValues, 10);

    // Get examples
    const examples = nonNullValues.slice(0, 5);

    // Calculate quality metrics
    const completeness = nonNullValues.length / values.length;
    const uniqueness = distinctCount / nonNullValues.length;

    return {
      name: columnName,
      dataType,
      nullCount,
      distinctCount,
      uniqueCount: uniqueValues.size,
      min,
      max,
      mean,
      median,
      stdDev,
      topValues,
      histogram,
      completeness,
      uniqueness,
      examples
    };
  }

  /**
   * Infer data type from values
   */
  private inferDataType(values: any[]): string {
    if (values.length === 0) return 'unknown';

    const sampleSize = Math.min(100, values.length);
    const sample = values.slice(0, sampleSize);

    const types = {
      number: 0,
      string: 0,
      boolean: 0,
      date: 0,
      object: 0
    };

    for (const value of sample) {
      if (typeof value === 'number') {
        types.number++;
      } else if (typeof value === 'boolean') {
        types.boolean++;
      } else if (typeof value === 'string') {
        // Try to parse as date
        const date = new Date(value);
        if (!isNaN(date.getTime()) && value.match(/\d{4}-\d{2}-\d{2}/)) {
          types.date++;
        } else if (!isNaN(Number(value))) {
          types.number++;
        } else {
          types.string++;
        }
      } else if (typeof value === 'object') {
        types.object++;
      }
    }

    // Return type with highest count
    return Object.entries(types).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /**
   * Calculate median
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(numbers: number[], mean: number): number {
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
    return Math.sqrt(variance);
  }

  /**
   * Generate histogram
   */
  private generateHistogram(numbers: number[], bins: number = 10): Array<{ bin: string; count: number }> {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const binSize = (max - min) / bins;

    const histogram: Array<{ bin: string; count: number }> = [];

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      const count = numbers.filter(n => n >= binStart && n < binEnd).length;

      histogram.push({
        bin: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
        count
      });
    }

    return histogram;
  }

  /**
   * Calculate top values
   */
  private calculateTopValues(values: any[], limit: number = 10): Array<{ value: any; count: number; percentage: number }> {
    const counts = new Map<any, number>();

    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([value, count]) => ({
      value,
      count,
      percentage: (count / values.length) * 100
    }));
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(profiles: ColumnProfile[]): number {
    if (profiles.length === 0) return 0;

    const avgCompleteness = profiles.reduce((sum, p) => sum + p.completeness, 0) / profiles.length;
    const avgUniqueness = profiles.reduce((sum, p) => sum + (p.uniqueness || 0), 0) / profiles.length;

    // Quality score is weighted average of completeness (70%) and uniqueness (30%)
    return (avgCompleteness * 0.7 + avgUniqueness * 0.3) * 100;
  }

  /**
   * Estimate data size in bytes
   */
  private estimateDataSize(data: any[]): number {
    // Rough estimation
    const jsonString = JSON.stringify(data);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  /**
   * Compare two profiles to detect schema changes
   */
  async compareProfiles(oldProfile: DatasetProfile, newProfile: DatasetProfile): Promise<any> {
    const changes: any = {
      columnChanges: [],
      schemaChanges: [],
      dataChanges: []
    };

    // Detect new/removed columns
    const oldColumns = new Set(oldProfile.columns.map(c => c.name));
    const newColumns = new Set(newProfile.columns.map(c => c.name));

    for (const col of newColumns) {
      if (!oldColumns.has(col)) {
        changes.schemaChanges.push({
          type: 'column_added',
          column: col
        });
      }
    }

    for (const col of oldColumns) {
      if (!newColumns.has(col)) {
        changes.schemaChanges.push({
          type: 'column_removed',
          column: col
        });
      }
    }

    // Compare column profiles for common columns
    for (const newCol of newProfile.columns) {
      const oldCol = oldProfile.columns.find(c => c.name === newCol.name);

      if (oldCol) {
        // Data type change
        if (oldCol.dataType !== newCol.dataType) {
          changes.columnChanges.push({
            type: 'data_type_changed',
            column: newCol.name,
            old: oldCol.dataType,
            new: newCol.dataType
          });
        }

        // Completeness change
        const completenessDiff = Math.abs(oldCol.completeness - newCol.completeness);
        if (completenessDiff > 0.1) {
          changes.dataChanges.push({
            type: 'completeness_changed',
            column: newCol.name,
            old: oldCol.completeness,
            new: newCol.completeness,
            diff: completenessDiff
          });
        }

        // Distinct count change
        const distinctDiff = Math.abs((oldCol.distinctCount - newCol.distinctCount) / oldCol.distinctCount);
        if (distinctDiff > 0.5) {
          changes.dataChanges.push({
            type: 'cardinality_changed',
            column: newCol.name,
            old: oldCol.distinctCount,
            new: newCol.distinctCount,
            percentChange: distinctDiff * 100
          });
        }
      }
    }

    return changes;
  }
}
