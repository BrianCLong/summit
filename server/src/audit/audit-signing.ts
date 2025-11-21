/**
 * Audit Signing Utilities
 *
 * Provides cryptographic functions for audit event integrity:
 * - SHA-256 hash calculation
 * - HMAC-SHA256 signature generation
 * - Timing-safe signature verification
 * - Hash chain management
 *
 * @module audit/signing
 * @see /docs/audit/hmac-signature-strategy.md
 */

import { createHash, createHmac, timingSafeEqual, randomBytes } from 'crypto';
import type { AuditEvent } from './audit-types';

/**
 * Signing configuration
 */
export interface SigningConfig {
  /** HMAC signing key (minimum 32 bytes recommended) */
  signingKey: string;
  /** Hash algorithm for event hashing */
  hashAlgorithm?: 'sha256' | 'sha512';
  /** HMAC algorithm for signatures */
  hmacAlgorithm?: 'sha256' | 'sha512';
}

/**
 * Hash chain verification result
 */
export interface HashChainResult {
  /** Whether the chain is valid */
  valid: boolean;
  /** Total events verified */
  totalEvents: number;
  /** Number of valid events */
  validEvents: number;
  /** Events that failed verification */
  invalidEvents: Array<{
    eventId: string;
    issue: 'hash_mismatch' | 'signature_invalid' | 'chain_broken';
    description: string;
  }>;
  /** Chain verification details */
  chainDetails: {
    startHash: string;
    endHash: string;
    chainIntact: boolean;
  };
}

/**
 * Fields included in the hash calculation.
 * Order matters for deterministic hashing.
 */
const HASHABLE_FIELDS = [
  'id',
  'eventType',
  'timestamp',
  'correlationId',
  'tenantId',
  'serviceId',
  'userId',
  'action',
  'outcome',
  'resourceType',
  'resourceId',
  'message',
  'details',
  'oldValues',
  'newValues',
] as const;

/**
 * Fields included in the signature payload.
 * These fields link the signature to the event and chain.
 */
const SIGNATURE_FIELDS = [
  'id',
  'hash',
  'timestamp',
  'tenantId',
  'previousEventHash',
] as const;

/**
 * Calculate SHA-256 hash of an audit event.
 *
 * The hash is calculated using a canonical JSON representation
 * (sorted keys) to ensure deterministic results.
 *
 * @param event - The audit event to hash
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns Hex-encoded hash string
 *
 * @example
 * ```typescript
 * const hash = calculateEventHash(event);
 * // => 'a1b2c3d4e5f6...'
 * ```
 */
export function calculateEventHash(
  event: Partial<AuditEvent>,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  // Extract hashable fields in deterministic order
  const hashableData: Record<string, unknown> = {};

  for (const field of HASHABLE_FIELDS) {
    const value = event[field as keyof AuditEvent];
    if (value !== undefined) {
      // Convert Date to ISO string for consistent hashing
      if (value instanceof Date) {
        hashableData[field] = value.toISOString();
      } else {
        hashableData[field] = value;
      }
    }
  }

  // Create canonical JSON (sorted keys at all levels)
  const canonical = JSON.stringify(hashableData, sortedReplacer);

  return createHash(algorithm).update(canonical, 'utf8').digest('hex');
}

/**
 * Generate HMAC-SHA256 signature for an audit event.
 *
 * The signature covers:
 * - Event ID
 * - Event hash
 * - Timestamp
 * - Tenant ID (prevents cross-tenant replay)
 * - Previous event hash (links to chain)
 *
 * @param event - The audit event to sign (must have hash calculated)
 * @param signingKey - HMAC signing key
 * @param algorithm - HMAC algorithm (default: sha256)
 * @returns Hex-encoded HMAC signature
 *
 * @example
 * ```typescript
 * event.hash = calculateEventHash(event);
 * event.signature = signEvent(event, process.env.SIGNING_KEY!);
 * ```
 */
export function signEvent(
  event: Partial<AuditEvent>,
  signingKey: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  if (!event.hash) {
    throw new Error('Event must have hash calculated before signing');
  }

  // Build signature payload
  const payload: Record<string, unknown> = {
    id: event.id,
    hash: event.hash,
    timestamp:
      event.timestamp instanceof Date
        ? event.timestamp.toISOString()
        : event.timestamp,
    tenantId: event.tenantId,
    previousEventHash: event.previousEventHash || '',
  };

  // Create canonical JSON
  const canonical = JSON.stringify(payload, sortedReplacer);

  return createHmac(algorithm, signingKey).update(canonical, 'utf8').digest('hex');
}

/**
 * Verify HMAC signature of an audit event.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param event - The audit event to verify
 * @param signingKey - HMAC signing key
 * @param algorithm - HMAC algorithm (default: sha256)
 * @returns True if signature is valid
 *
 * @example
 * ```typescript
 * if (!verifyEventSignature(event, process.env.SIGNING_KEY!)) {
 *   throw new Error('Event signature verification failed');
 * }
 * ```
 */
export function verifyEventSignature(
  event: Partial<AuditEvent>,
  signingKey: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  if (!event.signature) {
    return false;
  }

  try {
    // Calculate expected signature
    const expectedSignature = signEvent(event, signingKey, algorithm);

    // Convert to buffers for timing-safe comparison
    const eventSigBuffer = Buffer.from(event.signature, 'hex');
    const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');

    // Length check first (not timing-sensitive)
    if (eventSigBuffer.length !== expectedSigBuffer.length) {
      return false;
    }

    // Timing-safe comparison
    return timingSafeEqual(eventSigBuffer, expectedSigBuffer);
  } catch {
    return false;
  }
}

/**
 * Create a hash chain link for a new event.
 *
 * This function:
 * 1. Calculates the event hash
 * 2. Sets the previous event hash
 * 3. Generates the HMAC signature
 *
 * @param event - The event to add to the chain
 * @param previousHash - Hash of the previous event (empty for first event)
 * @param signingKey - HMAC signing key
 * @returns The event with hash, previousEventHash, and signature set
 *
 * @example
 * ```typescript
 * let lastHash = '';
 * for (const event of events) {
 *   const signedEvent = createHashChain(event, lastHash, signingKey);
 *   lastHash = signedEvent.hash!;
 *   await storeEvent(signedEvent);
 * }
 * ```
 */
export function createHashChain<T extends Partial<AuditEvent>>(
  event: T,
  previousHash: string,
  signingKey: string
): T & { hash: string; previousEventHash: string; signature: string } {
  // Calculate event hash
  const hash = calculateEventHash(event);

  // Create chain link
  const chainedEvent = {
    ...event,
    hash,
    previousEventHash: previousHash,
  };

  // Sign the event
  const signature = signEvent(chainedEvent, signingKey);

  return {
    ...chainedEvent,
    signature,
  };
}

/**
 * Verify hash chain integrity for a sequence of events.
 *
 * Checks:
 * 1. Each event's hash matches its content
 * 2. Each event's signature is valid
 * 3. Each event's previousEventHash matches the previous event's hash
 *
 * @param events - Events to verify (must be in chronological order)
 * @param signingKey - HMAC signing key
 * @param expectedStartHash - Expected hash of the event before the first event (empty for chain start)
 * @returns Verification result with details
 *
 * @example
 * ```typescript
 * const result = verifyHashChain(events, signingKey);
 * if (!result.valid) {
 *   console.error('Chain integrity violated:', result.invalidEvents);
 * }
 * ```
 */
export function verifyHashChain(
  events: Array<Partial<AuditEvent>>,
  signingKey: string,
  expectedStartHash: string = ''
): HashChainResult {
  const invalidEvents: HashChainResult['invalidEvents'] = [];
  let expectedPreviousHash = expectedStartHash;
  let lastValidHash = expectedStartHash;

  for (const event of events) {
    // 1. Verify hash
    const calculatedHash = calculateEventHash(event);
    if (event.hash !== calculatedHash) {
      invalidEvents.push({
        eventId: event.id || 'unknown',
        issue: 'hash_mismatch',
        description: `Hash mismatch: expected ${calculatedHash}, got ${event.hash}`,
      });
      continue;
    }

    // 2. Verify signature
    if (!verifyEventSignature(event, signingKey)) {
      invalidEvents.push({
        eventId: event.id || 'unknown',
        issue: 'signature_invalid',
        description: 'HMAC signature verification failed',
      });
      continue;
    }

    // 3. Verify chain linkage
    if (expectedPreviousHash && event.previousEventHash !== expectedPreviousHash) {
      invalidEvents.push({
        eventId: event.id || 'unknown',
        issue: 'chain_broken',
        description: `Chain broken: expected previousHash ${expectedPreviousHash}, got ${event.previousEventHash}`,
      });
    }

    // Update for next iteration
    expectedPreviousHash = event.hash!;
    lastValidHash = event.hash!;
  }

  return {
    valid: invalidEvents.length === 0,
    totalEvents: events.length,
    validEvents: events.length - invalidEvents.length,
    invalidEvents,
    chainDetails: {
      startHash: events[0]?.hash || '',
      endHash: lastValidHash,
      chainIntact:
        invalidEvents.filter((e) => e.issue === 'chain_broken').length === 0,
    },
  };
}

/**
 * Generate a cryptographically secure signing key.
 *
 * @param bytes - Number of bytes (default: 64 = 512 bits)
 * @param encoding - Output encoding (default: base64)
 * @returns Generated key as string
 *
 * @example
 * ```typescript
 * const key = generateSigningKey();
 * // Store in environment: LEDGER_SIGNING_KEY=...
 * ```
 */
export function generateSigningKey(
  bytes: number = 64,
  encoding: 'hex' | 'base64' | 'utf8' = 'base64'
): string {
  const buffer = randomBytes(bytes);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (buffer as any).toString(encoding);
}

/**
 * Validate that a signing key meets minimum requirements.
 *
 * @param key - The signing key to validate
 * @param minBytes - Minimum key length in bytes (default: 32)
 * @returns True if key is valid
 */
export function validateSigningKey(key: string, minBytes: number = 32): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Try to decode as base64 first
  try {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length >= minBytes) {
      return true;
    }
  } catch {
    // Not base64, check raw length
  }

  // Check raw byte length
  return Buffer.byteLength(key, 'utf8') >= minBytes;
}

/**
 * JSON replacer that sorts object keys recursively.
 * Ensures deterministic JSON output for hashing.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

/**
 * Calculate CRC32 checksum for write-once file entries.
 *
 * @param data - Data to checksum
 * @returns Hex-encoded CRC32 checksum
 */
export function calculateCRC32(data: string | Buffer): string {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

/**
 * Format an audit event for write-once file appending.
 *
 * @param event - The signed audit event
 * @param sequenceNumber - Sequential event number
 * @returns JSONL-formatted line for file append
 */
export function formatWriteOnceEntry(
  event: AuditEvent,
  sequenceNumber: bigint
): string {
  const entry = {
    seq: sequenceNumber.toString(),
    ts:
      event.timestamp instanceof Date
        ? event.timestamp.toISOString()
        : event.timestamp,
    id: event.id,
    type: event.eventType,
    hash: event.hash,
    sig: event.signature,
    prevHash: event.previousEventHash || '',
    data: Buffer.from(JSON.stringify(event)).toString('base64'),
  };

  const jsonLine = JSON.stringify(entry);
  const crc = calculateCRC32(jsonLine);

  // Append CRC to the entry
  const entryWithCrc = { ...entry, crc };

  return JSON.stringify(entryWithCrc);
}

/**
 * Parse a write-once file entry back to an audit event.
 *
 * @param line - JSONL line from write-once file
 * @returns Parsed audit event and metadata
 */
export function parseWriteOnceEntry(line: string): {
  sequenceNumber: bigint;
  event: AuditEvent;
  hash: string;
  signature: string;
  previousHash: string;
  valid: boolean;
} {
  const entry = JSON.parse(line);

  // Verify CRC
  const { crc, ...entryWithoutCrc } = entry;
  const expectedCrc = calculateCRC32(JSON.stringify(entryWithoutCrc));
  const valid = crc === expectedCrc;

  // Decode event data
  const eventJson = Buffer.from(entry.data, 'base64').toString('utf8');
  const event = JSON.parse(eventJson) as AuditEvent;

  return {
    sequenceNumber: BigInt(entry.seq),
    event,
    hash: entry.hash,
    signature: entry.sig,
    previousHash: entry.prevHash,
    valid,
  };
}
