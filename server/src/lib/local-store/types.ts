import { z } from 'zod';

// --- Envelope & Storage Formats ---

export const EncryptedEnvelopeSchema = z.object({
  v: z.literal(1), // Version
  k: z.string(),   // Key ID
  iv: z.string(),  // Base64 IV
  d: z.string(),   // Base64 Ciphertext
  t: z.string(),   // Base64 Auth Tag
  aad: z.object({
    tenantId: z.string(),
    type: z.string(),
    id: z.string(),
  }).passthrough(), // Allow extra AAD fields
});

export type EncryptedEnvelope = z.infer<typeof EncryptedEnvelopeSchema>;

export const StoreMetadataSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StoreMetadata = z.infer<typeof StoreMetadataSchema>;

export const KeyringEntrySchema = z.object({
  created: z.string(),
  material: z.string(), // Base64 key
  algorithm: z.literal('aes-256-gcm'),
});

export type KeyringEntry = z.infer<typeof KeyringEntrySchema>;

export const KeyringSchema = z.object({
  keys: z.record(z.string(), KeyringEntrySchema), // keyId -> KeyEntry
  activeKeyId: z.string(),
});

export type Keyring = z.infer<typeof KeyringSchema>;

export const ObjectIndexEntrySchema = z.object({
  path: z.string(),
  size: z.number(),
  hash: z.string().optional(),
  lastModified: z.string(),
});

export type ObjectIndexEntry = z.infer<typeof ObjectIndexEntrySchema>;

// Index: type -> id -> entry
export const ObjectIndexSchema = z.record(
  z.string(), // type
  z.record(z.string(), ObjectIndexEntrySchema) // id -> entry
);

export type ObjectIndex = z.infer<typeof ObjectIndexSchema>;

// --- Audit/Log Formats ---

export const IngestLogEntrySchema = z.object({
  ts: z.string(),
  packId: z.string().optional(),
  fileCount: z.number(),
  status: z.enum(['success', 'partial', 'failed']),
  details: z.string().optional(),
});

export type IngestLogEntry = z.infer<typeof IngestLogEntrySchema>;

export const TamperEventSchema = z.object({
  ts: z.string(),
  type: z.enum(['missing_file', 'extra_file', 'integrity_failure', 'decryption_failure', 'index_mismatch']),
  objectId: z.string().optional(),
  objectType: z.string().optional(),
  details: z.string(),
  severity: z.enum(['warning', 'critical']),
});

export type TamperEvent = z.infer<typeof TamperEventSchema>;

export interface VerifyReport {
  tenantId: string;
  valid: boolean;
  checkedCount: number;
  errors: TamperEvent[];
}

// --- Interfaces ---

export interface KeyProvider {
  getActiveKey(tenantId: string): Promise<{ id: string; material: Buffer }>;
  getKey(tenantId: string, keyId: string): Promise<Buffer>;
  rotateKey(tenantId: string): Promise<string>; // Returns new key ID
  initTenant(tenantId: string): Promise<void>;
}

export interface LocalStoreConfig {
  storePath: string;
}
