/**
 * Data Profiler
 * Analyzes data to generate quality metrics and patterns
 */

import {
  ProfilingResult,
  ColumnProfile,
  DataQualityMetrics,
  DataPattern,
  PatternType,
  ValueFrequency,
} from '../types/discovery.js';

export class DataProfiler {
  /**
   * Profile dataset
   */
  async profileData(assetId: string, data: any[], columns: string[]): Promise<ProfilingResult> {
    const columnProfiles = await Promise.all(
      columns.map((columnName) => this.profileColumn(columnName, data))
    );

    const dataQualityMetrics = this.calculateDataQuality(columnProfiles, data.length);
    const patterns = this.detectPatterns(columnProfiles);

    return {
      assetId,
      columnProfiles,
      dataQualityMetrics,
      patterns,
    };
  }

  /**
   * Profile individual column
   */
  private async profileColumn(columnName: string, data: any[]): Promise<ColumnProfile> {
    const values = data.map((row) => row[columnName]);
    const nonNullValues = values.filter((v) => v !== null && v !== undefined);

    const uniqueValues = new Set(nonNullValues);
    const nullCount = values.length - nonNullValues.length;

    const dataType = this.inferDataType(nonNullValues);
    const statistics = this.calculateStatistics(nonNullValues, dataType);
    const topValues = this.getTopValues(nonNullValues);
    const patterns = this.detectColumnPatterns(nonNullValues, dataType);

    return {
      columnName,
      dataType,
      nullable: nullCount > 0,
      uniqueCount: uniqueValues.size,
      nullCount,
      distinctCount: uniqueValues.size,
      minValue: statistics.min,
      maxValue: statistics.max,
      averageValue: statistics.avg,
      standardDeviation: statistics.stdDev,
      topValues,
      patterns,
    };
  }

  /**
   * Infer data type from values
   */
  private inferDataType(values: any[]): string {
    if (values.length === 0) {
      return 'unknown';
    }

    const sample = values[0];

    if (typeof sample === 'number') {
      return Number.isInteger(sample) ? 'integer' : 'decimal';
    } else if (typeof sample === 'boolean') {
      return 'boolean';
    } else if (sample instanceof Date) {
      return 'date';
    } else if (typeof sample === 'string') {
      // Check if it's a date string
      if (!isNaN(Date.parse(sample))) {
        return 'date';
      }
      return 'string';
    }

    return 'unknown';
  }

  /**
   * Calculate statistics for numeric columns
   */
  private calculateStatistics(values: any[], dataType: string): any {
    if (dataType !== 'integer' && dataType !== 'decimal') {
      return {
        min: null,
        max: null,
        avg: null,
        stdDev: null,
      };
    }

    const numbers = values.filter((v) => typeof v === 'number');

    if (numbers.length === 0) {
      return {
        min: null,
        max: null,
        avg: null,
        stdDev: null,
      };
    }

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    const avg = sum / numbers.length;

    const variance = numbers.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    return { min, max, avg, stdDev };
  }

  /**
   * Get top values by frequency
   */
  private getTopValues(values: any[], limit: number = 10): ValueFrequency[] {
    const frequencyMap = new Map<any, number>();

    for (const value of values) {
      frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
    }

    const totalCount = values.length;
    const frequencies: ValueFrequency[] = Array.from(frequencyMap.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / totalCount) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return frequencies;
  }

  /**
   * Detect column patterns
   */
  private detectColumnPatterns(values: any[], dataType: string): string[] {
    if (dataType !== 'string') {
      return [];
    }

    const patterns: string[] = [];
    const stringValues = values.filter((v) => typeof v === 'string');

    if (stringValues.length === 0) {
      return patterns;
    }

    // Email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (stringValues.some((v) => emailPattern.test(v))) {
      patterns.push('EMAIL');
    }

    // Phone pattern
    const phonePattern = /^\+?[\d\s()-]{10,}$/;
    if (stringValues.some((v) => phonePattern.test(v))) {
      patterns.push('PHONE');
    }

    // URL pattern
    const urlPattern = /^https?:\/\/.+/;
    if (stringValues.some((v) => urlPattern.test(v))) {
      patterns.push('URL');
    }

    // IP Address pattern
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (stringValues.some((v) => ipPattern.test(v))) {
      patterns.push('IP_ADDRESS');
    }

    return patterns;
  }

  /**
   * Calculate overall data quality metrics
   */
  private calculateDataQuality(profiles: ColumnProfile[], totalRows: number): DataQualityMetrics {
    if (profiles.length === 0 || totalRows === 0) {
      return {
        completeness: 0,
        uniqueness: 0,
        validity: 0,
        consistency: 0,
        accuracy: 0,
        timeliness: 1.0,
      };
    }

    // Completeness: percentage of non-null values
    const completeness =
      profiles.reduce((sum, p) => sum + (totalRows - p.nullCount), 0) / (profiles.length * totalRows);

    // Uniqueness: average uniqueness across columns
    const uniqueness = profiles.reduce((sum, p) => sum + p.uniqueCount / totalRows, 0) / profiles.length;

    // Validity: assume 100% for now (would need validation rules)
    const validity = 1.0;

    // Consistency: based on standard deviation (lower is better)
    const consistency = 0.85; // Placeholder

    // Accuracy: placeholder (would need reference data)
    const accuracy = 0.9;

    // Timeliness: placeholder (would need timestamp analysis)
    const timeliness = 1.0;

    return {
      completeness,
      uniqueness,
      validity,
      consistency,
      accuracy,
      timeliness,
    };
  }

  /**
   * Detect data patterns across columns
   */
  private detectPatterns(profiles: ColumnProfile[]): DataPattern[] {
    const patterns: DataPattern[] = [];

    for (const profile of profiles) {
      for (const patternType of profile.patterns) {
        patterns.push({
          type: patternType as PatternType,
          pattern: patternType,
          confidence: 0.9,
          examples: [],
        });
      }
    }

    return patterns;
  }
}
