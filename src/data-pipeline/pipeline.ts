import { ApiSource, CsvSource, DatabaseSource, JsonSource } from './ingestion.js';
import { LineageTracker } from './lineage.js';
import { PipelineMonitor } from './monitoring.js';
import { DataQualityChecker, QualityRuleset } from './quality.js';
import { SchemaRegistry } from './schemaRegistry.js';
import { TransformationPipeline } from './transforms.js';
import {
  DataRecord,
  DeadLetterEntry,
  IngestionResult,
  IngestionSource,
  PipelineMetricsSnapshot,
  SchemaVersion,
} from './types.js';
import { DeadLetterQueue, RecordCleaner, SchemaValidator } from './validation.js';
import type { LineageEvent } from './lineage.js';

export interface PipelineConfig {
  schemaVersion: string;
  qualityRules: QualityRuleset;
  deduplicationKey: string;
  watermarkField: string;
  initialWatermark?: number | string;
  maxPagesPerSource?: number;
}

export interface PipelineOutcome {
  processed: DataRecord[];
  metrics: PipelineMetricsSnapshot[];
  deadLetters: DeadLetterEntry[];
}

export class DataPipeline {
  private readonly sources: IngestionSource[];
  private readonly validator: SchemaValidator;
  private readonly registry: SchemaRegistry;
  private readonly cleaner = new RecordCleaner();
  private readonly dlq = new DeadLetterQueue();
  private readonly quality: DataQualityChecker;
  private readonly transformPipeline: TransformationPipeline;
  private readonly monitor = new PipelineMonitor();
  private readonly lineage = new LineageTracker();
  private readonly deduplicationKey: string;
  private readonly watermarkField: string;
  private readonly baseQualityRules: QualityRuleset;
  private readonly maxPagesPerSource: number;
  private readonly schemaVersion: string;
  private readonly seenKeys: Set<unknown> = new Set();
  private watermark: number | string | undefined;

  constructor(
    sources: IngestionSource[],
    registry: SchemaRegistry,
    transformPipeline: TransformationPipeline,
    quality: DataQualityChecker,
    config: PipelineConfig,
    validator?: SchemaValidator
  ) {
    this.sources = sources;
    this.registry = registry;
    const schema = this.resolveSchema(config.schemaVersion);
    this.validator = validator ?? new SchemaValidator(schema.schema);
    this.schemaVersion = schema.version;
    this.transformPipeline = transformPipeline;
    this.quality = quality;
    this.deduplicationKey = config.deduplicationKey;
    this.watermarkField = config.watermarkField;
    this.baseQualityRules = config.qualityRules;
    this.maxPagesPerSource = config.maxPagesPerSource ?? 50;
    this.watermark = config.initialWatermark;
  }

  async run(): Promise<PipelineOutcome> {
    const processed: DataRecord[] = [];
    this.quality.reset();

    for (const source of this.sources) {
      const lineageId = this.lineage.createId(source.name);
      let cursor: string | number | undefined;
      let pageCount = 0;

      do {
        const result = await this.safeLoad(source, cursor, lineageId);
        if (!result) {
          break;
        }

        for (const record of result.records) {
          this.monitor.increment(source.name, 'processed');
          const cleaned = this.cleaner.clean(record);

          if (!this.hasDeduplicationKey(cleaned)) {
            this.monitor.increment(source.name, 'failed');
            this.dlq.push({
              record: cleaned,
              reason: `Missing deduplication key ${this.deduplicationKey}`,
              source: source.name,
              timestamp: Date.now(),
              lineageId,
            });
            continue;
          }

          const dedupeValue = cleaned[this.deduplicationKey];
          if (this.seenKeys.has(dedupeValue)) {
            this.monitor.increment(source.name, 'deduplicated');
            continue;
          }

          if (this.shouldFilterByWatermark(cleaned)) {
            this.monitor.increment(source.name, 'filtered');
            continue;
          }

          const validation = this.validator.validate(cleaned);
          if (!validation.valid) {
            this.monitor.increment(source.name, 'failed');
            this.dlq.push({
              record: cleaned,
              reason: validation.errors.map((error) => error.message).join('; '),
              source: source.name,
              timestamp: Date.now(),
              lineageId,
            });
            continue;
          }

          const transformed = this.safeTransform(cleaned, source.name, lineageId);
          if (!transformed) {
            continue;
          }

          const qualityReport = this.quality.run(transformed, this.buildQualityRules());
          const failedQuality = qualityReport.results.some((result) => !result.passed);
          if (failedQuality) {
            this.monitor.increment(source.name, 'qualityFailures');
            this.dlq.push({
              record: transformed,
              reason: qualityReport.results
                .filter((result) => !result.passed)
                .map((result) => result.details)
                .join('; '),
              source: source.name,
              timestamp: Date.now(),
              lineageId,
            });
            continue;
          }

          this.lineage.record(source.name, lineageId, this.transformPipeline.snapshot());
          this.seenKeys.add(dedupeValue);
          this.updateWatermark(transformed);
          this.monitor.increment(source.name, 'succeeded');
          processed.push(transformed);
        }

        cursor = result.cursor;
        pageCount += 1;
      } while (cursor !== undefined && pageCount < this.maxPagesPerSource);
    }

    return {
      processed,
      metrics: this.monitor.snapshot(),
      deadLetters: this.dlq.drain(),
    };
  }

  private buildQualityRules(): QualityRuleset {
    const schema = this.registry.get(this.schemaVersion) ?? this.registry.latest();
    const schemaRules: QualityRuleset = schema
      ? {
          required: Object.keys((schema.schema as { properties?: Record<string, unknown> }).properties ?? {}).map(
            (field) => ({ field })
          ),
        }
      : {};
    return {
      required: [
        ...(schemaRules.required ?? []),
        ...(this.baseQualityRules.required ?? []),
        { field: this.deduplicationKey },
      ],
      ranges: [...(schemaRules.ranges ?? []), ...(this.baseQualityRules.ranges ?? [])],
      unique: [...(schemaRules.unique ?? []), ...(this.baseQualityRules.unique ?? [])],
    };
  }

  private resolveSchema(version: string): SchemaVersion {
    const schema = this.registry.get(version) ?? this.registry.latest();
    if (!schema) {
      throw new Error(`Schema version ${version} not found and no fallback available`);
    }
    return schema;
  }

  private shouldFilterByWatermark(record: DataRecord): boolean {
    if (this.watermark === undefined) {
      return false;
    }
    const value = record[this.watermarkField];
    if (value === undefined) {
      return false;
    }
    if (typeof value === 'number' && typeof this.watermark === 'number') {
      return value <= this.watermark;
    }
    if (typeof value === 'string' && typeof this.watermark === 'string') {
      return value <= this.watermark;
    }
    return false;
  }

  private updateWatermark(record: DataRecord): void {
    const value = record[this.watermarkField];
    if (value === undefined) {
      return;
    }
    if (typeof value === 'number') {
      if (typeof this.watermark !== 'number' || value > (this.watermark as number)) {
        this.watermark = value;
      }
    } else if (typeof value === 'string') {
      if (typeof this.watermark !== 'string' || value > (this.watermark as string)) {
        this.watermark = value;
      }
    }
  }

  private async safeLoad(
    source: IngestionSource,
    cursor: string | number | undefined,
    lineageId: string
  ): Promise<IngestionResult | null> {
    try {
      return await source.load(cursor);
    } catch (error) {
      this.monitor.increment(source.name, 'ingestionErrors');
      this.dlq.push({
        record: {},
        reason: `Ingestion error: ${(error as Error).message}`,
        source: source.name,
        timestamp: Date.now(),
        lineageId,
      });
      return null;
    }
  }

  private safeTransform(record: DataRecord, source: string, lineageId: string): DataRecord | null {
    try {
      return this.transformPipeline.apply(record, {
        source,
        lineageId,
      });
    } catch (error) {
      this.monitor.increment(source, 'failed');
      this.dlq.push({
        record,
        reason: `Transformation error: ${(error as Error).message}`,
        source,
        timestamp: Date.now(),
        lineageId,
      });
      return null;
    }
  }

  private hasDeduplicationKey(record: DataRecord): boolean {
    return record[this.deduplicationKey] !== undefined && record[this.deduplicationKey] !== null;
  }

  lineageHistory(): LineageEvent[] {
    return this.lineage.history();
  }
}

export const createDefaultPipeline = (
  sources: IngestionSource[],
  schemaRegistry: SchemaRegistry,
  transformPipeline: TransformationPipeline,
  qualityChecker: DataQualityChecker,
  config: PipelineConfig,
  schemaValidator?: SchemaValidator
): DataPipeline =>
  new DataPipeline(
    sources,
    schemaRegistry,
    transformPipeline,
    qualityChecker,
    config,
    schemaValidator
  );

export const IngestionAdapters = {
  CsvSource,
  JsonSource,
  ApiSource,
  DatabaseSource,
};
