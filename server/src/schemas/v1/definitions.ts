import { z } from 'zod';

// Receipt v0.1 Source-of-Truth
export const ProvenanceReceiptSchema = z.object({
  id: z.string().min(3).regex(/^[A-Za-z0-9._:-]+$/).describe('Stable identifier for the receipt'),
  payload: z.object({}).catchall(z.any()).describe('Canonical payload the receipt covers'),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/).describe('Hex-encoded SHA-256 hash of the canonical payload'),
  issuedAt: z.string().datetime().describe('RFC3339 timestamp when the receipt was produced'),
  metadata: z.object({}).catchall(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe('Optional contextual metadata attached to the receipt'),
  signature: z.string().min(16).describe('Base64-encoded signature produced by the signer'),
  signer: z.object({
    keyId: z.string().min(3),
    algorithm: z.enum(['RSASSA_PSS_SHA_256', 'RSASSA_PSS_SHA_384', 'RSASSA_PSS_SHA_512']),
    publicKey: z.string().describe('Optional PEM-encoded public key when available').optional(),
  }).describe('Information about the key material that produced the receipt'),
}).strict().describe('ProvenanceReceipt');

// PolicyDecision v0.1 Source-of-Truth
export const PolicyDecisionSchema = z.object({
  id: z.string().regex(/^pdec_[a-zA-Z0-9\-_.]+$/),
  timestamp: z.string().datetime(),
  policy: z.object({
    package: z.string(),
    version: z.string(),
    rule: z.string().optional(),
  }).describe('Policy information'),
  input: z.object({}).catchall(z.any()),
  result: z.object({
    allow: z.boolean(),
    reasons: z.array(z.string()).optional(),
    metadata: z.object({}).catchall(z.any()).optional(),
  }),
}).strict().describe('Policy Decision');
