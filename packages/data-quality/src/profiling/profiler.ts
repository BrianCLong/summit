/**
 * Data profiling engine for automated data quality assessment
 */

import { Pool } from 'pg';
import {
  DataProfile,
  DataStatistics,
  PatternAnalysis,
  DistributionAnalysis,
  HistogramBin,
  ProfilingConfig,
} from '../types.js';

export class DataProfiler {
  constructor(private pool: Pool) {}

  /**
   * Profile a dataset column with comprehensive analysis
   */
  async profileColumn(
    tableName: string,
    columnName: string,
    config: ProfilingConfig = {}
  ): Promise<DataProfile> {
    const {
      sampleSize,
      includePatterns = true,
      includeDistribution = true,
      includeStatistics = true,
    } = config;

    const client = await this.pool.connect();
    try {
      // Get basic metrics
      const basicMetrics = await this.getBasicMetrics(client, tableName, columnName, sampleSize);

      // Get data type
      const dataType = await this.detectDataType(client, tableName, columnName);

      // Get statistics if enabled
      const statistics = includeStatistics
        ? await this.calculateStatistics(client, tableName, columnName, dataType, sampleSize)
        : this.getEmptyStatistics();

      // Get pattern analysis if enabled
      const patterns = includePatterns
        ? await this.analyzePatterns(client, tableName, columnName, sampleSize)
        : [];

      const profile: DataProfile = {
        id: this.generateId(),
        datasetId: tableName,
        columnName,
        dataType,
        totalRows: basicMetrics.totalRows,
        nullCount: basicMetrics.nullCount,
        uniqueCount: basicMetrics.uniqueCount,
        duplicateCount: basicMetrics.totalRows - basicMetrics.uniqueCount,
        completeness: this.calculateCompleteness(basicMetrics),
        uniqueness: this.calculateUniqueness(basicMetrics),
        validity: await this.calculateValidity(client, tableName, columnName, dataType, sampleSize),
        statistics,
        patterns,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return profile;
    } finally {
      client.release();
    }
  }

  /**
   * Profile entire dataset
   */
  async profileDataset(tableName: string, config: ProfilingConfig = {}): Promise<DataProfile[]> {
    const client = await this.pool.connect();
    try {
      const columns = await this.getTableColumns(client, tableName);
      const profiles: DataProfile[] = [];

      for (const column of columns) {
        const profile = await this.profileColumn(tableName, column, config);
        profiles.push(profile);
      }

      return profiles;
    } finally {
      client.release();
    }
  }

  private async getBasicMetrics(
    client: any,
    tableName: string,
    columnName: string,
    sampleSize?: number
  ) {
    const sampleClause = sampleSize ? `TABLESAMPLE BERNOULLI(${Math.min((sampleSize / 10000) * 100, 100)})` : '';

    const query = `
      SELECT
        COUNT(*) as total_rows,
        COUNT("${columnName}") as non_null_count,
        COUNT(*) - COUNT("${columnName}") as null_count,
        COUNT(DISTINCT "${columnName}") as unique_count
      FROM "${tableName}" ${sampleClause}
    `;

    const result = await client.query(query);
    return {
      totalRows: parseInt(result.rows[0].total_rows),
      nonNullCount: parseInt(result.rows[0].non_null_count),
      nullCount: parseInt(result.rows[0].null_count),
      uniqueCount: parseInt(result.rows[0].unique_count),
    };
  }

  private async detectDataType(client: any, tableName: string, columnName: string): Promise<string> {
    const query = `
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    `;
    const result = await client.query(query, [tableName, columnName]);
    return result.rows[0]?.data_type || 'unknown';
  }

  private async calculateStatistics(
    client: any,
    tableName: string,
    columnName: string,
    dataType: string,
    sampleSize?: number
  ): Promise<DataStatistics> {
    const isNumeric = ['integer', 'numeric', 'double precision', 'real', 'bigint'].includes(dataType);

    if (!isNumeric) {
      return this.getEmptyStatistics();
    }

    const sampleClause = sampleSize ? `TABLESAMPLE BERNOULLI(${Math.min((sampleSize / 10000) * 100, 100)})` : '';

    const query = `
      SELECT
        MIN("${columnName}")::float as min_val,
        MAX("${columnName}")::float as max_val,
        AVG("${columnName}")::float as mean_val,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "${columnName}") as median_val,
        STDDEV("${columnName}")::float as std_dev,
        VARIANCE("${columnName}")::float as variance_val
      FROM "${tableName}" ${sampleClause}
      WHERE "${columnName}" IS NOT NULL
    `;

    const result = await client.query(query);
    const row = result.rows[0];

    // Calculate percentiles
    const percentiles = await this.calculatePercentiles(client, tableName, columnName, sampleClause);

    // Calculate distribution
    const distribution = await this.calculateDistribution(client, tableName, columnName, sampleClause);

    return {
      min: row.min_val,
      max: row.max_val,
      mean: row.mean_val,
      median: row.median_val,
      standardDeviation: row.std_dev,
      variance: row.variance_val,
      percentiles,
      distribution,
    };
  }

  private async calculatePercentiles(
    client: any,
    tableName: string,
    columnName: string,
    sampleClause: string
  ): Promise<Record<number, number>> {
    const percentileValues = [25, 50, 75, 90, 95, 99];
    const percentiles: Record<number, number> = {};

    for (const p of percentileValues) {
      const query = `
        SELECT PERCENTILE_CONT(${p / 100}) WITHIN GROUP (ORDER BY "${columnName}") as percentile
        FROM "${tableName}" ${sampleClause}
        WHERE "${columnName}" IS NOT NULL
      `;
      const result = await client.query(query);
      percentiles[p] = parseFloat(result.rows[0].percentile);
    }

    return percentiles;
  }

  private async calculateDistribution(
    client: any,
    tableName: string,
    columnName: string,
    sampleClause: string
  ): Promise<DistributionAnalysis> {
    const query = `
      WITH stats AS (
        SELECT
          MIN("${columnName}") as min_val,
          MAX("${columnName}") as max_val,
          (MAX("${columnName}") - MIN("${columnName}")) / 10 as bin_width
        FROM "${tableName}" ${sampleClause}
        WHERE "${columnName}" IS NOT NULL
      ),
      histogram AS (
        SELECT
          WIDTH_BUCKET("${columnName}",
            (SELECT min_val FROM stats),
            (SELECT max_val FROM stats),
            10) as bucket,
          COUNT(*) as frequency
        FROM "${tableName}" ${sampleClause}
        WHERE "${columnName}" IS NOT NULL
        GROUP BY bucket
        ORDER BY bucket
      )
      SELECT * FROM histogram
    `;

    const result = await client.query(query);
    const histogram: HistogramBin[] = result.rows.map((row: any, index: number) => ({
      range: [index * 10, (index + 1) * 10] as [number, number],
      count: parseInt(row.frequency),
      frequency: parseFloat(row.frequency),
    }));

    return {
      type: this.detectDistributionType(histogram),
      confidence: 0.8,
      histogram,
    };
  }

  private detectDistributionType(histogram: HistogramBin[]): DistributionAnalysis['type'] {
    // Simple heuristic-based distribution detection
    const frequencies = histogram.map(bin => bin.count);
    const maxFreq = Math.max(...frequencies);
    const maxIndex = frequencies.indexOf(maxFreq);

    if (maxIndex === Math.floor(frequencies.length / 2)) {
      return 'normal';
    } else if (maxIndex === 0) {
      return 'exponential';
    } else if (maxIndex === frequencies.length - 1) {
      return 'skewed';
    }

    return 'unknown';
  }

  private async analyzePatterns(
    client: any,
    tableName: string,
    columnName: string,
    sampleSize?: number
  ): Promise<PatternAnalysis[]> {
    const sampleClause = sampleSize ? `LIMIT ${sampleSize}` : 'LIMIT 1000';

    const query = `
      SELECT "${columnName}", COUNT(*) as count
      FROM "${tableName}"
      WHERE "${columnName}" IS NOT NULL
      GROUP BY "${columnName}"
      ORDER BY count DESC
      ${sampleClause}
    `;

    const result = await client.query(query);
    const patterns: PatternAnalysis[] = [];

    // Analyze value patterns
    const totalCount = result.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);

    for (const row of result.rows.slice(0, 10)) {
      patterns.push({
        pattern: String(row[columnName]),
        count: parseInt(row.count),
        percentage: (parseInt(row.count) / totalCount) * 100,
        examples: [row[columnName]],
      });
    }

    return patterns;
  }

  private async calculateValidity(
    client: any,
    tableName: string,
    columnName: string,
    dataType: string,
    sampleSize?: number
  ): Promise<number> {
    // Simple validity check - can be extended with more sophisticated rules
    const sampleClause = sampleSize ? `TABLESAMPLE BERNOULLI(${Math.min((sampleSize / 10000) * 100, 100)})` : '';

    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN "${columnName}" IS NOT NULL THEN 1 END) as valid
      FROM "${tableName}" ${sampleClause}
    `;

    const result = await client.query(query);
    const total = parseInt(result.rows[0].total);
    const valid = parseInt(result.rows[0].valid);

    return total > 0 ? (valid / total) * 100 : 0;
  }

  private calculateCompleteness(metrics: any): number {
    const { totalRows, nonNullCount } = metrics;
    return totalRows > 0 ? (nonNullCount / totalRows) * 100 : 0;
  }

  private calculateUniqueness(metrics: any): number {
    const { totalRows, uniqueCount } = metrics;
    return totalRows > 0 ? (uniqueCount / totalRows) * 100 : 0;
  }

  private async getTableColumns(client: any, tableName: string): Promise<string[]> {
    const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    const result = await client.query(query, [tableName]);
    return result.rows.map((row: { column_name: string }) => row.column_name);
  }

  private getEmptyStatistics(): DataStatistics {
    return {
      percentiles: {},
      distribution: {
        type: 'unknown',
        confidence: 0,
        histogram: [],
      },
    };
  }

  private generateId(): string {
    return `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
