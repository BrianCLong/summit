import { z } from 'zod';
import { ExtractionResult } from '@intelgraph/metadata-extractor';

/**
 * Timeline analysis types
 */

// Timeline event
export const TimelineEventSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  timestamp: z.date(),
  eventType: z.string(),
  source: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// Timeline
export const TimelineSchema = z.object({
  id: z.string(),
  events: z.array(TimelineEventSchema),
  startTime: z.date(),
  endTime: z.date(),
  artifacts: z.number(),
  sources: z.array(z.string()),
});

export type Timeline = z.infer<typeof TimelineSchema>;

// Temporal correlation
export const TemporalCorrelationSchema = z.object({
  id: z.string(),
  eventIds: z.array(z.string()),
  correlationType: z.enum(['sequence', 'concurrent', 'causal', 'periodic']),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  pattern: z.string().optional(),
});

export type TemporalCorrelation = z.infer<typeof TemporalCorrelationSchema>;

// Timeline analysis result
export const TimelineAnalysisSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  timeline: TimelineSchema,
  correlations: z.array(TemporalCorrelationSchema),
  anomalies: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    eventIds: z.array(z.string()),
    evidence: z.any(),
  })),
  patterns: z.array(z.object({
    type: z.string(),
    description: z.string(),
    occurrences: z.number(),
    eventIds: z.array(z.string()),
    confidence: z.number(),
  })),
  gaps: z.array(z.object({
    startTime: z.date(),
    endTime: z.date(),
    duration: z.number(), // milliseconds
    severity: z.enum(['low', 'medium', 'high']),
  })),
});

export type TimelineAnalysis = z.infer<typeof TimelineAnalysisSchema>;
