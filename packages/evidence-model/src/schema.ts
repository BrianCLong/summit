import { z } from 'zod';

// --- EvidenceObject ---

export const EvidenceObjectSchema = z.object({
  id: z.string().describe("Unique identifier for the evidence object (usually a hash of content)"),
  contentHash: z.string().describe("SHA-256 hash of the canonicalized content"),
  content: z.record(z.string(), z.any()).describe("The actual evidence data"),
  source: z.string().describe("Source identifier (e.g., 'ingest-worker-1', 'user-upload')"),
  captureMethod: z.string().describe("Method of capture (e.g., 'api', 'scrape', 'manual')"),
  timestamp: z.string().datetime().describe("ISO 8601 timestamp of capture"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional metadata"),
  compartments: z.array(z.string()).optional().describe("Security compartments"),
});

export type EvidenceObject = z.infer<typeof EvidenceObjectSchema>;

// --- Claim ---

export const ClaimSchema = z.object({
  id: z.string().describe("Unique identifier for the claim"),
  subject: z.string().describe("Subject of the claim"),
  predicate: z.string().describe("Predicate of the claim"),
  object: z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.any())]).describe("Object of the claim"),
  context: z.record(z.string(), z.any()).optional().describe("Contextual information"),
  sourceEvidenceIds: z.array(z.string()).describe("IDs of evidence supporting this claim"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score 0-1"),
  generatedAt: z.string().datetime().describe("ISO 8601 timestamp of generation"),
});

export type Claim = z.infer<typeof ClaimSchema>;

// --- ConflictSet ---

export const ConflictTypeSchema = z.enum(['contradiction', 'temporal', 'source_divergence']);

export const ConflictSetSchema = z.object({
  id: z.string().describe("Unique identifier for the conflict set"),
  type: ConflictTypeSchema,
  claimIds: z.array(z.string()).describe("IDs of conflicting claims"),
  description: z.string().optional().describe("Human readable description of the conflict"),
  detectedAt: z.string().datetime().describe("ISO 8601 timestamp of detection"),
});

export type ConflictSet = z.infer<typeof ConflictSetSchema>;

// --- TransformReceipt ---

export const TransformReceiptSchema = z.object({
  id: z.string().describe("Unique identifier for the receipt"),
  transformId: z.string().describe("ID of the transform applied"),
  transformVersion: z.string().describe("Version of the transform"),
  inputEvidenceIds: z.array(z.string()).describe("IDs of input evidence"),
  params: z.record(z.string(), z.any()).optional().describe("Parameters passed to the transform"),
  outputHash: z.string().describe("Hash of the output"),
  executedAt: z.string().datetime().describe("ISO 8601 timestamp of execution"),
  durationMs: z.number().optional().describe("Execution duration in milliseconds"),
  signature: z.string().optional().describe("Cryptographic signature of the receipt"),
});

export type TransformReceipt = z.infer<typeof TransformReceiptSchema>;

// --- BeliefState ---

export const BeliefStateSchema = z.object({
  claimId: z.string().describe("ID of the claim"),
  beliefScore: z.number().min(0).max(1).describe("Calculated belief score"),
  confidenceInterval: z.tuple([z.number(), z.number()]).optional().describe("Confidence interval [low, high]"),
  rationale: z.array(z.string()).describe("List of evidence/receipt IDs justifying the belief"),
  lastRecomputeReceiptId: z.string().optional().describe("ID of the receipt for the last recompute"),
  updatedAt: z.string().datetime().describe("ISO 8601 timestamp of update"),
});

export type BeliefState = z.infer<typeof BeliefStateSchema>;
