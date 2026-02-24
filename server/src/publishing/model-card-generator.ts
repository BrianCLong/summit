/**
 * Model Card Generator
 *
 * Generates model cards that document data lineage, transforms,
 * and characteristics for proof-carrying publishing.
 */

import { createHash } from 'crypto';
import type { ModelCard, TransformRecord } from './proof-carrying-types';

export interface DataSource {
  id: string;
  type: 'database' | 'api' | 'file' | 'stream';
  location: string;
  timestamp: string;
  hash?: string;
}

export interface TransformInput {
  type: TransformRecord['type'];
  parameters: Record<string, unknown>;
  operator: string;
  justification?: string;
}

export interface QualityMetrics {
  completeness?: number;
  accuracy?: number;
  consistency?: number;
  timeliness?: number;
}

export class ModelCardGenerator {
  private transforms: TransformRecord[] = [];
  private sources: DataSource[] = [];

  /**
   * Create a new model card builder
   */
  static create(
    id: string,
    name: string,
    description: string,
    createdBy: string
  ): ModelCardGenerator {
    const generator = new ModelCardGenerator();
    generator['id'] = id;
    generator['name'] = name;
    generator['description'] = description;
    generator['createdBy'] = createdBy;
    generator['createdAt'] = new Date().toISOString();
    return generator;
  }

  private id!: string;
  private name!: string;
  private description!: string;
  private createdBy!: string;
  private createdAt!: string;
  private schema?: Record<string, unknown>;
  private recordCount?: number;
  private dataSensitivity: ModelCard['dataSensitivity'] = 'internal';
  private qualityMetrics?: QualityMetrics;

  /**
   * Add a data source
   */
  addSource(source: DataSource): this {
    this.sources.push(source);
    return this;
  }

  /**
   * Add multiple sources
   */
  addSources(sources: DataSource[]): this {
    this.sources.push(...sources);
    return this;
  }

  /**
   * Record a transformation
   */
  addTransform(input: TransformInput, inputData?: Buffer | string): this {
    const inputHash = inputData
      ? createHash('sha256').update(inputData).digest('hex')
      : '';

    const transform: TransformRecord = {
      id: `transform-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type: input.type,
      timestamp: new Date().toISOString(),
      inputHash,
      outputHash: '', // Will be set when output is available
      parameters: input.parameters,
      operator: input.operator,
      justification: input.justification,
    };

    this.transforms.push(transform);
    return this;
  }

  /**
   * Update the output hash of the most recent transform
   */
  setLastTransformOutput(outputData: Buffer | string): this {
    if (this.transforms.length === 0) {
      throw new Error('No transforms to update');
    }

    const lastTransform = this.transforms[this.transforms.length - 1];
    lastTransform.outputHash = createHash('sha256')
      .update(outputData)
      .digest('hex');

    return this;
  }

  /**
   * Set data schema
   */
  setSchema(schema: Record<string, unknown>): this {
    this.schema = schema;
    return this;
  }

  /**
   * Set record count
   */
  setRecordCount(count: number): this {
    this.recordCount = count;
    return this;
  }

  /**
   * Set data sensitivity level
   */
  setSensitivity(level: ModelCard['dataSensitivity']): this {
    this.dataSensitivity = level;
    return this;
  }

  /**
   * Set quality metrics
   */
  setQualityMetrics(metrics: QualityMetrics): this {
    this.qualityMetrics = metrics;
    return this;
  }

  /**
   * Build the model card
   */
  build(): ModelCard {
    return {
      id: this.id,
      version: '1.0',
      name: this.name,
      description: this.description,
      sources: this.sources,
      transforms: this.transforms,
      schema: this.schema,
      recordCount: this.recordCount,
      dataSensitivity: this.dataSensitivity,
      qualityMetrics: this.qualityMetrics,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Validate transform chain integrity
   */
  validateTransformChain(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.transforms.length === 0) {
      return { valid: true, errors: [] };
    }

    // Check that each transform has both input and output hashes
    for (let i = 0; i < this.transforms.length; i++) {
      const transform = this.transforms[i];

      if (!transform.inputHash && i > 0) {
        errors.push(`Transform ${i} (${transform.id}) missing input hash`);
      }

      if (!transform.outputHash) {
        errors.push(`Transform ${i} (${transform.id}) missing output hash`);
      }

      // Check chain continuity - output of previous should match input of next
      if (i > 0 && transform.inputHash) {
        const prevTransform = this.transforms[i - 1];
        if (prevTransform.outputHash !== transform.inputHash) {
          errors.push(
            `Transform chain broken between ${prevTransform.id} and ${transform.id}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Helper to create model card from export data
 */
export function createModelCardFromExport(
  exportId: string,
  exportData: {
    name: string;
    description: string;
    user: string;
    sources: DataSource[];
    transforms?: TransformInput[];
    sensitivity?: ModelCard['dataSensitivity'];
    schema?: Record<string, unknown>;
    recordCount?: number;
  }
): ModelCard {
  const generator = ModelCardGenerator.create(
    `model-card-${exportId}`,
    exportData.name,
    exportData.description,
    exportData.user
  );

  // Add sources
  generator.addSources(exportData.sources);

  // Add transforms if provided
  if (exportData.transforms) {
    for (const transform of exportData.transforms) {
      generator.addTransform(transform);
    }
  }

  // Set optional fields
  if (exportData.sensitivity) {
    generator.setSensitivity(exportData.sensitivity);
  }

  if (exportData.schema) {
    generator.setSchema(exportData.schema);
  }

  if (exportData.recordCount !== undefined) {
    generator.setRecordCount(exportData.recordCount);
  }

  return generator.build();
}

/**
 * Calculate quality metrics from data
 */
export function calculateQualityMetrics(data: {
  totalRecords: number;
  completeRecords: number;
  validatedRecords?: number;
  consistentRecords?: number;
  dataAge?: number; // milliseconds since creation
}): QualityMetrics {
  const metrics: QualityMetrics = {};

  // Completeness: percentage of records with all required fields
  if (data.totalRecords > 0) {
    metrics.completeness = data.completeRecords / data.totalRecords;
  }

  // Accuracy: percentage of validated records
  if (data.validatedRecords !== undefined && data.totalRecords > 0) {
    metrics.accuracy = data.validatedRecords / data.totalRecords;
  }

  // Consistency: percentage of records that pass consistency checks
  if (data.consistentRecords !== undefined && data.totalRecords > 0) {
    metrics.consistency = data.consistentRecords / data.totalRecords;
  }

  // Timeliness: decay factor based on age (fresher data = higher score)
  if (data.dataAge !== undefined) {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    metrics.timeliness = Math.max(0, 1 - data.dataAge / maxAge);
  }

  return metrics;
}

/**
 * Merge multiple model cards (e.g., when combining datasets)
 */
export function mergeModelCards(
  cards: ModelCard[],
  mergedName: string,
  mergedBy: string
): ModelCard {
  if (cards.length === 0) {
    throw new Error('Cannot merge empty model card array');
  }

  const generator = ModelCardGenerator.create(
    `merged-${Date.now()}`,
    mergedName,
    `Merged from ${cards.length} model cards`,
    mergedBy
  );

  // Collect all sources
  const allSources: DataSource[] = [];
  for (const card of cards) {
    allSources.push(...card.sources);
  }
  generator.addSources(allSources);

  // Collect all transforms
  for (const card of cards) {
    for (const transform of card.transforms) {
      generator.addTransform({
        type: transform.type,
        parameters: transform.parameters,
        operator: transform.operator,
        justification: transform.justification,
      });
    }
  }

  // Use highest sensitivity level
  const sensitivities: ModelCard['dataSensitivity'][] = [
    'public',
    'internal',
    'confidential',
    'restricted',
  ];
  const maxSensitivity = cards
    .map(c => c.dataSensitivity)
    .reduce((max, curr) => {
      const maxIdx = sensitivities.indexOf(max);
      const currIdx = sensitivities.indexOf(curr);
      return currIdx > maxIdx ? curr : max;
    });
  generator.setSensitivity(maxSensitivity);

  // Sum record counts
  const totalRecords = cards.reduce(
    (sum, card) => sum + (card.recordCount || 0),
    0
  );
  if (totalRecords > 0) {
    generator.setRecordCount(totalRecords);
  }

  // Average quality metrics
  const avgMetrics: QualityMetrics = {};
  const metricsCount = cards.filter(c => c.qualityMetrics).length;
  if (metricsCount > 0) {
    const sum = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
    };

    for (const card of cards) {
      if (card.qualityMetrics) {
        sum.completeness += card.qualityMetrics.completeness || 0;
        sum.accuracy += card.qualityMetrics.accuracy || 0;
        sum.consistency += card.qualityMetrics.consistency || 0;
        sum.timeliness += card.qualityMetrics.timeliness || 0;
      }
    }

    avgMetrics.completeness = sum.completeness / metricsCount;
    avgMetrics.accuracy = sum.accuracy / metricsCount;
    avgMetrics.consistency = sum.consistency / metricsCount;
    avgMetrics.timeliness = sum.timeliness / metricsCount;

    generator.setQualityMetrics(avgMetrics);
  }

  return generator.build();
}
