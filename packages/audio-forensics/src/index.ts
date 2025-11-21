/**
 * @intelgraph/audio-forensics
 *
 * Audio forensics capabilities including:
 * - Audio authenticity verification
 * - Edit detection
 * - Source device identification
 * - Timeline reconstruction
 * - Chain of custody tracking
 */

import { z } from 'zod';
import type { AudioBuffer } from '@intelgraph/audio-processing';

export const AuthenticityResultSchema = z.object({
  isAuthentic: z.boolean(),
  confidence: z.number().min(0).max(1),
  tampering: z.array(z.object({
    type: z.enum(['splice', 'copy-move', 'insertion', 'deletion', 'resampling']),
    startTime: z.number(),
    endTime: z.number(),
    confidence: z.number()
  })),
  metadata: z.object({
    recordingDevice: z.string().optional(),
    recordingEnvironment: z.string().optional(),
    compressionHistory: z.array(z.string()).optional()
  })
});

export type AuthenticityResult = z.infer<typeof AuthenticityResultSchema>;

export const EditDetectionResultSchema = z.object({
  edits: z.array(z.object({
    type: z.string(),
    location: z.number(),
    duration: z.number(),
    confidence: z.number()
  })),
  editCount: z.number(),
  continuityScore: z.number().min(0).max(1)
});

export type EditDetectionResult = z.infer<typeof EditDetectionResultSchema>;

export const ChainOfCustodySchema = z.object({
  recordId: z.string(),
  events: z.array(z.object({
    timestamp: z.date(),
    actor: z.string(),
    action: z.enum(['created', 'accessed', 'modified', 'transferred', 'analyzed']),
    location: z.string(),
    hash: z.string(),
    signature: z.string().optional()
  })),
  currentHash: z.string(),
  verified: z.boolean()
});

export type ChainOfCustody = z.infer<typeof ChainOfCustodySchema>;

export interface IAuthenticityVerifier {
  verify(audio: AudioBuffer): Promise<AuthenticityResult>;
  detectEdits(audio: AudioBuffer): Promise<EditDetectionResult>;
}

export interface ISourceIdentifier {
  identifyDevice(audio: AudioBuffer): Promise<{ device: string; confidence: number }>;
  identifyEnvironment(audio: AudioBuffer): Promise<{ environment: string; confidence: number }>;
}

export interface IForensicReporter {
  generateReport(audio: AudioBuffer, analysis: AuthenticityResult): Promise<string>;
}

export interface IChainOfCustodyManager {
  initiate(audio: AudioBuffer, metadata: Record<string, unknown>): Promise<ChainOfCustody>;
  addEvent(recordId: string, event: Omit<ChainOfCustody['events'][0], 'timestamp' | 'hash'>): Promise<void>;
  verify(recordId: string): Promise<boolean>;
}
