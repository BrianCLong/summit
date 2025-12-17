import { z } from 'zod';

/**
 * Core event schema with provenance metadata
 */
export const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.number().int().positive(),
  data: z.record(z.unknown()),
  metadata: z.object({
    version: z.string().default('1.0.0'),
    correlationId: z.string().uuid().optional(),
    causationId: z.string().uuid().optional(),
    userId: z.string().optional(),
    tenantId: z.string().optional(),
  }),
  provenance: z.object({
    hash: z.string(),
    signature: z.string().optional(),
    policyTags: z.array(z.string()).default([]),
    classification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).default('UNCLASSIFIED'),
    source: z.string(),
    ingestionTime: z.number().int().positive(),
    transformations: z.array(z.object({
      operation: z.string(),
      timestamp: z.number().int().positive(),
      userId: z.string().optional(),
    })).default([]),
  }),
});

export type Event = z.infer<typeof EventSchema>;

/**
 * Checkpoint for deterministic replay
 */
export const CheckpointSchema = z.object({
  id: z.string().uuid(),
  topic: z.string(),
  partition: z.number().int().nonnegative(),
  offset: z.string(),
  timestamp: z.number().int().positive(),
  eventCount: z.number().int().nonnegative(),
  hash: z.string(),
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

/**
 * Replay request schema
 */
export const ReplayRequestSchema = z.object({
  checkpointId: z.string().uuid().optional(),
  fromOffset: z.string().optional(),
  toOffset: z.string().optional(),
  topic: z.string(),
  targetTopic: z.string().optional(),
  filters: z.object({
    eventTypes: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),
    tenantIds: z.array(z.string()).optional(),
  }).optional(),
});

export type ReplayRequest = z.infer<typeof ReplayRequestSchema>;

/**
 * Event store record
 */
export interface EventStoreRecord {
  id: string;
  event_type: string;
  source: string;
  timestamp: bigint;
  data: unknown;
  metadata: unknown;
  provenance: unknown;
  partition: number;
  offset: string;
  created_at: Date;
}
