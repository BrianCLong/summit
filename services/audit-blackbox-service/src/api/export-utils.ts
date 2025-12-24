// @ts-nocheck
import { createHash } from 'crypto';
import type { AuditEvent } from '../core/types.js';
import { AuditEventSchema } from '../core/types.js';
import {
  GENESIS_HASH,
  calculateChainHash,
  calculateEventHash,
} from '../core/hash-utils.js';

export interface ExportManifest {
  id: string;
  generatedAt: string;
  range: { from: string; to: string };
  page: number;
  pageSize: number;
  totalEvents: number;
  exportedEvents: number;
  checksum: string;
}

export interface ExportVerificationReport {
  valid: boolean;
  issues: string[];
  startHash: string;
  endHash: string;
  verifiedAt: string;
}

const PII_FIELDS: Array<keyof AuditEvent> = [
  'userName',
  'userEmail',
  'ipAddress',
  'ipAddressV6',
  'userAgent',
  'geolocation',
  'deviceFingerprint',
  'impersonatedBy',
];

export function sanitizeEventForExport(event: AuditEvent): AuditEvent {
  const clone: AuditEvent = { ...event, redacted: true };

  for (const field of PII_FIELDS) {
    delete (clone as Record<string, unknown>)[field];
  }

  return clone;
}

export function verifyChainForExport(
  events: AuditEvent[],
): ExportVerificationReport {
  if (events.length === 0) {
    return {
      valid: true,
      issues: [],
      startHash: GENESIS_HASH,
      endHash: GENESIS_HASH,
      verifiedAt: new Date().toISOString(),
    };
  }

  const sorted = [...events].sort((a, b) => {
    const seqA = a.sequenceNumber ?? 0n;
    const seqB = b.sequenceNumber ?? 0n;

    if (seqA !== seqB) return seqA < seqB ? -1 : 1;

    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  const issues: string[] = [];
  let startHash = sorted[0].previousEventHash || GENESIS_HASH;
  let expectedPreviousHash = startHash;
  let expectedSequence = sorted[0].sequenceNumber ?? 1n;
  let endHash = startHash;

  for (const event of sorted) {
    if (event.sequenceNumber === undefined) {
      issues.push(`Event ${event.id} is missing a sequence number`);
      continue;
    }

    if (event.sequenceNumber !== expectedSequence) {
      issues.push(
        `Sequence gap detected: expected ${expectedSequence}, found ${event.sequenceNumber}`,
      );
      expectedSequence = event.sequenceNumber;
    }

    const computedEventHash = calculateEventHash(event);
    if (event.hash && event.hash !== computedEventHash) {
      issues.push(`Hash mismatch for event ${event.id}`);
    }

    if (
      event.previousEventHash &&
      event.previousEventHash !== expectedPreviousHash
    ) {
      issues.push(
        `Previous hash mismatch at ${event.id}: expected ${expectedPreviousHash}, received ${event.previousEventHash}`,
      );
    }

    const chainHash = calculateChainHash(
      event.hash || computedEventHash,
      expectedPreviousHash,
      event.sequenceNumber,
    );

    expectedPreviousHash = chainHash;
    endHash = chainHash;
    expectedSequence += 1n;
  }

  return {
    valid: issues.length === 0,
    issues,
    startHash,
    endHash,
    verifiedAt: new Date().toISOString(),
  };
}

export function buildManifest(
  events: AuditEvent[],
  from: Date,
  to: Date,
  page: number,
  pageSize: number,
  totalEvents: number,
): ExportManifest {
  const checksum = createHash('sha256')
    .update(
      JSON.stringify(events, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    )
    .digest('hex');

  return {
    id: `audit-export-${from.toISOString()}-${to.toISOString()}-${page}`,
    generatedAt: new Date().toISOString(),
    range: { from: from.toISOString(), to: to.toISOString() },
    page,
    pageSize,
    totalEvents,
    exportedEvents: events.length,
    checksum,
  };
}

export function buildSchemaSummary(): Record<string, unknown> {
  const fields = Object.keys(AuditEventSchema.shape);
  return {
    version: '1.0.0',
    fields,
  };
}
