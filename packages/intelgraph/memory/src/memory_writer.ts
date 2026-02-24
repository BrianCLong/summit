import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { calculateTrustScore, TrustScoreInputs } from './trust_score';

export const MemoryTypeSchema = z.enum(['graph', 'vector', 'episodic', 'file']);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export const MemoryEnvelopeSchema = z.object({
  memory_id: z.string().uuid(),
  memory_type: MemoryTypeSchema,
  source_agent: z.string(),
  run_id: z.string(),
  timestamp: z.string().datetime(), // ISO 8601
  confidence_score: z.number().min(0).max(1),
  provenance_refs: z.array(z.string()),
  compaction_group: z.string().optional(),
  content: z.any()
});

export type MemoryEnvelope = z.infer<typeof MemoryEnvelopeSchema>;

export interface WriteOptions {
  memoryType: MemoryType;
  sourceAgent: string;
  runId: string;
  provenanceRefs?: string[];
  compactionGroup?: string;
  trustInputs?: TrustScoreInputs; // Optional: Calculate trust on write
  confidenceScore?: number;       // Explicit confidence
}

export class UnifiedMemoryWriter {

  /**
   * Wraps content in a standard memory envelope, validates schema, and returns the envelope.
   * In a real system, this would also persist to the underlying store.
   */
  async write(content: any, options: WriteOptions): Promise<MemoryEnvelope> {
    const memoryId = uuidv4();
    const timestamp = new Date();

    let confidence = options.confidenceScore ?? 1.0;

    if (options.trustInputs) {
      // Recalculate trust based on inputs if provided
      // Overrides explicit confidence if both are present?
      // Usually trust score implies confidence.
      confidence = calculateTrustScore({
        ...options.trustInputs,
        timestamp: options.trustInputs.timestamp || timestamp
      });
    }

    const envelope: MemoryEnvelope = {
      memory_id: memoryId,
      memory_type: options.memoryType,
      source_agent: options.sourceAgent,
      run_id: options.runId,
      timestamp: timestamp.toISOString(),
      confidence_score: confidence,
      provenance_refs: options.provenanceRefs || [],
      compaction_group: options.compactionGroup,
      content: content
    };

    // Validate Schema
    const result = MemoryEnvelopeSchema.safeParse(envelope);
    if (!result.success) {
      throw new Error(`Memory Envelope Validation Failed: ${result.error.message}`);
    }

    // TODO: Actually write to DB (Graph, Vector, etc.) based on memory_type
    console.log(`[MemoryWriter] Writing ${options.memoryType} memory ${memoryId} from ${options.sourceAgent}`);

    return envelope;
  }
}
