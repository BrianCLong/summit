// src/ingest/streamingIngest.ts
import { v4 as uuidv4 } from 'uuid';
import { assertCompatible } from './schemaCompat';
import { DataPipeline, PipelineConfig, PipelineOutcome } from '../data-pipeline/pipeline';
import { IngestionSource, DeadLetterEntry, DataRecord } from '../data-pipeline/types';
import { SchemaRegistry } from '../data-pipeline/schemaRegistry';
import { TransformationPipeline } from '../data-pipeline/transforms';
import { DataQualityChecker } from '../data-pipeline/quality';

/**
 * A more robust in-memory Dead Letter Queue for this specific process.
 */
class StreamingIngestDLQ {
  private entries: Map<string, DeadLetterEntry> = new Map();

  push(entry: DeadLetterEntry): void {
    const id = uuidv4();
    this.entries.set(id, { ...entry, lineageId: entry.lineageId || id });
  }

  drain(): DeadLetterEntry[] {
    const drained = Array.from(this.entries.values());
    this.entries.clear();
    return drained;
  }
}

export interface StreamingIngestParams {
  source: IngestionSource;
  subject: string;
  schemaId: string;
  registry: SchemaRegistry;
  transformPipeline: TransformationPipeline;
  qualityChecker: DataQualityChecker;
  pipelineConfig: PipelineConfig;
}

/**
 * Orchestrates the streaming ingest process.
 * 1. Asserts schema compatibility.
 * 2. If compatible, runs the standard data pipeline.
 * 3. If not, sends the entire batch of records to a Dead Letter Queue.
 */
export async function processStreamingIngest(params: StreamingIngestParams): Promise<PipelineOutcome> {
  const {
    source,
    subject,
    schemaId,
    registry,
    transformPipeline,
    qualityChecker,
    pipelineConfig,
  } = params;

  const dlq = new StreamingIngestDLQ();

  try {
    // Step 1: Assert schema compatibility before processing
    await assertCompatible(subject, schemaId);

    // Step 2: If compatible, run the existing data pipeline
    const pipeline = new DataPipeline(
      [source],
      registry,
      transformPipeline,
      qualityChecker,
      pipelineConfig
    );
    const result = await pipeline.run();
    return result;

  } catch (error: any) {
    // Step 3: If schema is incompatible, DLQ the entire batch
    if (error.code === 'SCHEMA_INCOMPATIBLE') {
      console.error('Schema compatibility check failed:', error.message);

      // Load all records from the source to send them to the DLQ
      const ingestionResult = await source.load();
      const reason = error.details?.reason || 'Schema incompatible';

      for (const record of ingestionResult.records) {
        dlq.push({
          record,
          reason,
          source: source.name,
          timestamp: Date.now(),
          lineageId: uuidv4(), // Use uuid for a unique lineageId
        });
      }

      // Return an outcome with only dead letters
      return {
        processed: [],
        metrics: [],
        deadLetters: dlq.drain(),
      };
    }

    // For any other type of error, re-throw it
    throw error;
  }
}
