import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { ClassificationEngine, ClassificationOptions } from './classifier.js';
import {
  BulkScanReport,
  ClassifiedEntity,
  ScanOptions,
  ScanResult,
  ScanTargetRecord,
  SchemaFieldMetadata
} from './types.js';

interface ScannerStateEntry {
  hash: string;
  detections: ClassifiedEntity[];
}

interface FlattenedField {
  path: string[];
  value: string;
  schemaField?: SchemaFieldMetadata;
}

const digestDetections = (detections: ClassifiedEntity[]): string =>
  detections
    .map((detection) => `${detection.type}:${detection.value}:${detection.severity}:${detection.confidence.toFixed(2)}`)
    .sort()
    .join('|');

const stableStringify = (input: unknown): string => {
  if (input === null || input === undefined) {
    return 'null';
  }
  if (typeof input === 'string') {
    return input;
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }
  if (Array.isArray(input)) {
    return `[${input.map((value) => stableStringify(value)).join(',')}]`;
  }
  if (typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, value]) => `${key}:${stableStringify(value)}`).join(',')}}`;
  }
  return '';
};

const fingerprint = (value: unknown): string => crypto.createHash('sha256').update(stableStringify(value)).digest('hex');

const flattenRecord = (value: unknown, schemaFields: SchemaFieldMetadata[] | undefined, path: string[] = []): FlattenedField[] => {
  if (value === null || value === undefined) {
    return [];
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const fieldName = path[path.length - 1];
    const schemaField = schemaFields?.find((field) => field.fieldName === fieldName);
    return [
      {
        path,
        value: String(value),
        schemaField
      }
    ];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenRecord(item, schemaFields, [...path, String(index)]));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
      const schemaField = schemaFields?.find((field) => field.fieldName === key);
      if (schemaField) {
        return flattenRecord(nested, schemaFields, [...path, key]);
      }
      return flattenRecord(nested, schemaFields, [...path, key]);
    });
  }
  return [];
};

export class BulkScanner {
  private readonly engine: ClassificationEngine;
  private readonly state = new Map<string, ScannerStateEntry>();

  constructor(engine?: ClassificationEngine) {
    this.engine = engine ?? new ClassificationEngine();
  }

  async scan(records: ScanTargetRecord[], options: ScanOptions & ClassificationOptions = {}): Promise<BulkScanReport> {
    const batchSize = options.batchSize ?? 250;
    const batches: ScanTargetRecord[][] = [];
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }

    const results: ScanResult[] = [];
    let newDetections = 0;
    let updatedDetections = 0;
    let unchanged = 0;
    const startTime = performance.now();

    for (const batch of batches) {
      for (const record of batch) {
        const scanResult = await this.scanRecord(record, options);
        if (!scanResult.changed && !options.includeUnchanged) {
          unchanged += 1;
          continue;
        }
        if (scanResult.changed) {
          const previous = this.state.get(record.id);
          if (!previous) {
            newDetections += 1;
          } else {
            updatedDetections += 1;
          }
          this.state.set(record.id, {
            hash: scanResult.currentHash ?? '',
            detections: scanResult.detected
          });
        } else {
          unchanged += 1;
        }
        results.push(scanResult);
      }
    }

    const durationMs = performance.now() - startTime;

    return {
      results,
      newDetections,
      updatedDetections,
      unchanged,
      durationMs
    };
  }

  async scanRecord(record: ScanTargetRecord, options: ScanOptions & ClassificationOptions = {}): Promise<ScanResult> {
    const hash = record.hash ?? fingerprint(record.value);
    const stateEntry = this.state.get(record.id);
    if (options.incremental && stateEntry && stateEntry.hash === hash) {
      return {
        recordId: record.id,
        tableName: record.tableName,
        detected: stateEntry.detections,
        changed: false,
        previousHash: stateEntry.hash,
        currentHash: hash
      };
    }

    const flattened = flattenRecord(record.value, record.schema?.fields ?? [], [record.tableName ?? record.schema?.name ?? 'record']);
    const detections: ClassifiedEntity[] = [];
    for (const field of flattened) {
      const classification = await this.engine.classify(field.value, {
        value: field.value,
        schema: record.schema,
        schemaField: field.schemaField,
        recordId: record.id,
        tableName: record.tableName,
        additionalContext: {
          path: field.path.join('.'),
          updatedAt: record.updatedAt
        }
      }, options);
      for (const entity of classification.entities) {
        detections.push({
          ...entity,
          metadata: {
            ...entity.metadata,
            fieldPath: field.path,
            recordId: record.id
          }
        });
      }
    }

    const digest = digestDetections(detections);
    const previous = this.state.get(record.id);
    const previousDigest = previous ? digestDetections(previous.detections) : undefined;
    const changed = !previous || previous.hash !== hash || previousDigest !== digest;

    return {
      recordId: record.id,
      tableName: record.tableName,
      detected: detections,
      changed,
      previousHash: previous?.hash,
      currentHash: hash
    };
  }

  clearState(): void {
    this.state.clear();
  }
}

