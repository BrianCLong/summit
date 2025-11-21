import { v4 as uuid } from 'uuid';
import {
  DataProfile,
  ColumnProfile,
  DataQualityDimension,
  DiscoveredSource,
} from '../types.js';
import { logger } from '../utils/logger.js';

interface ProfilerConfig {
  sampleSize: number;
  detectPii: boolean;
  inferRelationships: boolean;
}

const SEMANTIC_PATTERNS: Record<string, RegExp> = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s\-()]{10,}$/,
  ssn: /^\d{3}-\d{2}-\d{4}$/,
  credit_card: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  ip_address: /^(?:\d{1,3}\.){3}\d{1,3}$/,
  url: /^https?:\/\/[^\s]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  date_iso: /^\d{4}-\d{2}-\d{2}$/,
  datetime_iso: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
};

const PII_TYPES = ['email', 'phone', 'ssn', 'credit_card'];

/**
 * Data Profiler
 * Analyzes data sources to extract metadata, quality metrics, and relationships
 */
export class DataProfiler {
  private config: ProfilerConfig;
  private profiles: Map<string, DataProfile> = new Map();

  constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = {
      sampleSize: config.sampleSize ?? 10000,
      detectPii: config.detectPii ?? true,
      inferRelationships: config.inferRelationships ?? true,
    };
  }

  /**
   * Profile a discovered data source
   */
  async profile(source: DiscoveredSource, data: unknown[][]): Promise<DataProfile> {
    logger.info('Profiling data source', { sourceId: source.id, name: source.name });

    const startTime = Date.now();

    // Sample data if too large
    const sampleData = data.length > this.config.sampleSize
      ? this.sampleRows(data, this.config.sampleSize)
      : data;

    // Extract header row
    const headers = sampleData[0] as string[];
    const rows = sampleData.slice(1);

    // Profile each column
    const columns: ColumnProfile[] = headers.map((header, index) => {
      const columnData = rows.map(row => row[index]);
      return this.profileColumn(header, columnData);
    });

    // Infer relationships between columns
    const relationships = this.config.inferRelationships
      ? this.inferRelationships(columns, headers)
      : [];

    // Calculate overall quality score
    const overallQuality = this.calculateOverallQuality(columns);

    const profile: DataProfile = {
      sourceId: source.id,
      tableName: source.metadata?.tableName as string,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
      relationships,
      overallQuality,
      profiledAt: new Date(),
    };

    this.profiles.set(source.id, profile);

    logger.info('Profiling complete', {
      sourceId: source.id,
      duration: Date.now() - startTime,
      quality: overallQuality,
    });

    return profile;
  }

  /**
   * Profile a single column
   */
  private profileColumn(name: string, data: unknown[]): ColumnProfile {
    const nonNull = data.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNull.map(String));

    // Detect data type
    const dataType = this.inferDataType(nonNull);

    // Detect semantic type
    const semanticType = this.detectSemanticType(nonNull);

    // Check for PII
    const piiDetected = this.config.detectPii && PII_TYPES.includes(semanticType || '');

    // Detect patterns
    const patterns = this.detectPatterns(nonNull);

    // Calculate quality scores
    const qualityScores = this.calculateColumnQuality(data, nonNull, uniqueValues);

    return {
      name,
      dataType,
      nullable: nonNull.length < data.length,
      uniqueCount: uniqueValues.size,
      nullCount: data.length - nonNull.length,
      sampleValues: nonNull.slice(0, 5),
      patterns,
      semanticType,
      piiDetected,
      qualityScores,
    };
  }

  /**
   * Infer data type from values
   */
  private inferDataType(values: unknown[]): string {
    if (values.length === 0) return 'unknown';

    const sample = values.slice(0, 100);
    const types = sample.map(v => {
      if (typeof v === 'number') return 'number';
      if (typeof v === 'boolean') return 'boolean';
      if (v instanceof Date) return 'date';
      if (typeof v === 'string') {
        if (!isNaN(Number(v)) && v.trim() !== '') return 'number';
        if (SEMANTIC_PATTERNS.date_iso.test(v)) return 'date';
        if (SEMANTIC_PATTERNS.datetime_iso.test(v)) return 'datetime';
        return 'string';
      }
      if (Array.isArray(v)) return 'array';
      if (typeof v === 'object') return 'object';
      return 'unknown';
    });

    // Return most common type
    const typeCounts = types.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Detect semantic type (email, phone, etc.)
   */
  private detectSemanticType(values: unknown[]): string | undefined {
    if (values.length === 0) return undefined;

    const stringValues = values
      .filter(v => typeof v === 'string')
      .slice(0, 100) as string[];

    if (stringValues.length === 0) return undefined;

    for (const [type, pattern] of Object.entries(SEMANTIC_PATTERNS)) {
      const matches = stringValues.filter(v => pattern.test(v)).length;
      if (matches / stringValues.length > 0.8) {
        return type;
      }
    }

    return undefined;
  }

  /**
   * Detect value patterns
   */
  private detectPatterns(values: unknown[]): string[] {
    const patterns: string[] = [];
    const stringValues = values
      .filter(v => typeof v === 'string')
      .slice(0, 100) as string[];

    if (stringValues.length === 0) return patterns;

    // Detect common prefixes
    const prefixes = new Map<string, number>();
    for (const v of stringValues) {
      const prefix = v.substring(0, 3);
      prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
    }

    for (const [prefix, count] of prefixes) {
      if (count / stringValues.length > 0.5) {
        patterns.push(`prefix:${prefix}`);
      }
    }

    // Detect length patterns
    const lengths = stringValues.map(v => v.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const allSameLength = lengths.every(l => l === lengths[0]);

    if (allSameLength) {
      patterns.push(`fixed_length:${lengths[0]}`);
    }

    return patterns;
  }

  /**
   * Calculate quality scores for a column
   */
  private calculateColumnQuality(
    data: unknown[],
    nonNull: unknown[],
    uniqueValues: Set<string>
  ): Record<DataQualityDimension, number> {
    const total = data.length;
    const nonNullCount = nonNull.length;
    const uniqueCount = uniqueValues.size;

    return {
      completeness: total > 0 ? nonNullCount / total : 0,
      accuracy: 0.9, // Would need reference data to calculate
      consistency: this.calculateConsistency(nonNull),
      timeliness: 1.0, // Assume current data
      validity: this.calculateValidity(nonNull),
      uniqueness: nonNullCount > 0 ? uniqueCount / nonNullCount : 0,
    };
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistency(values: unknown[]): number {
    if (values.length === 0) return 1;

    // Check type consistency
    const types = values.map(v => typeof v);
    const primaryType = types.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxTypeCount = Math.max(...Object.values(primaryType));
    return maxTypeCount / types.length;
  }

  /**
   * Calculate validity score
   */
  private calculateValidity(values: unknown[]): number {
    if (values.length === 0) return 1;

    // Check for common invalid patterns
    let invalidCount = 0;
    for (const v of values) {
      if (typeof v === 'string') {
        if (v.trim() === '' || v === 'N/A' || v === 'null' || v === 'undefined') {
          invalidCount++;
        }
      }
    }

    return 1 - (invalidCount / values.length);
  }

  /**
   * Infer relationships between columns
   */
  private inferRelationships(
    columns: ColumnProfile[],
    headers: string[]
  ): DataProfile['relationships'] {
    const relationships: DataProfile['relationships'] = [];

    // Look for foreign key patterns (column names ending with _id)
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const header = headers[i].toLowerCase();

      if (header.endsWith('_id') && col.dataType === 'number') {
        const targetTable = header.replace(/_id$/, '');
        relationships.push({
          sourceColumn: headers[i],
          targetTable,
          targetColumn: 'id',
          relationshipType: 'inferred',
          confidence: 0.7,
        });
      }
    }

    // Look for semantic relationships (email -> user, etc.)
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (col.semanticType === 'email') {
        relationships.push({
          sourceColumn: headers[i],
          targetTable: 'users',
          targetColumn: 'email',
          relationshipType: 'semantic',
          confidence: 0.6,
        });
      }
    }

    return relationships;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQuality(columns: ColumnProfile[]): number {
    if (columns.length === 0) return 0;

    const weights: Record<DataQualityDimension, number> = {
      completeness: 0.25,
      accuracy: 0.20,
      consistency: 0.20,
      timeliness: 0.10,
      validity: 0.15,
      uniqueness: 0.10,
    };

    let totalScore = 0;
    for (const col of columns) {
      let colScore = 0;
      for (const [dim, weight] of Object.entries(weights)) {
        colScore += (col.qualityScores[dim as DataQualityDimension] || 0) * weight;
      }
      totalScore += colScore;
    }

    return totalScore / columns.length;
  }

  /**
   * Sample rows from data
   */
  private sampleRows(data: unknown[][], sampleSize: number): unknown[][] {
    if (data.length <= sampleSize) return data;

    // Keep header row
    const header = data[0];
    const rows = data.slice(1);

    // Random sampling
    const sampled = rows
      .map((row, index) => ({ row, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, sampleSize - 1)
      .map(({ row }) => row);

    return [header, ...sampled];
  }

  /**
   * Get profile for a source
   */
  getProfile(sourceId: string): DataProfile | undefined {
    return this.profiles.get(sourceId);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): DataProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Generate profile report
   */
  generateReport(profile: DataProfile): string {
    const lines: string[] = [
      `# Data Profile Report`,
      ``,
      `**Source ID**: ${profile.sourceId}`,
      `**Table**: ${profile.tableName || 'N/A'}`,
      `**Rows**: ${profile.rowCount.toLocaleString()}`,
      `**Columns**: ${profile.columnCount}`,
      `**Overall Quality**: ${(profile.overallQuality * 100).toFixed(1)}%`,
      `**Profiled At**: ${profile.profiledAt.toISOString()}`,
      ``,
      `## Column Details`,
      ``,
    ];

    for (const col of profile.columns) {
      lines.push(`### ${col.name}`);
      lines.push(`- **Type**: ${col.dataType}${col.semanticType ? ` (${col.semanticType})` : ''}`);
      lines.push(`- **Nullable**: ${col.nullable}`);
      lines.push(`- **Unique Values**: ${col.uniqueCount.toLocaleString()}`);
      lines.push(`- **Null Count**: ${col.nullCount.toLocaleString()}`);
      if (col.piiDetected) {
        lines.push(`- **PII Detected**: Yes`);
      }
      lines.push(`- **Quality**: Completeness ${(col.qualityScores.completeness * 100).toFixed(0)}%, ` +
        `Validity ${(col.qualityScores.validity * 100).toFixed(0)}%`);
      lines.push(``);
    }

    if (profile.relationships.length > 0) {
      lines.push(`## Relationships`);
      lines.push(``);
      for (const rel of profile.relationships) {
        lines.push(`- ${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn} ` +
          `(${rel.relationshipType}, confidence: ${(rel.confidence * 100).toFixed(0)}%)`);
      }
    }

    return lines.join('\n');
  }
}
