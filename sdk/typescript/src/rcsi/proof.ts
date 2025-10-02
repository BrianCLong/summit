import { createHash } from 'crypto';

import type { IndexSnapshot, Proof } from './types';

const NANOS_IN_MILLISECOND = 1_000_000n;

function timestampToNanoseconds(value: string): bigint {
  const baseMs = BigInt(Date.parse(value));
  const match = value.match(/\.([0-9]+)(Z|[+-]\d{2}:?\d{2})?$/);
  let nanos = baseMs * NANOS_IN_MILLISECOND;
  if (match && match[1]) {
    const fractional = match[1].padEnd(9, '0').slice(0, 9);
    nanos += BigInt(fractional);
  }
  return nanos;
}

export function digestFor(
  kind: 'document' | 'term',
  term: string | undefined,
  documentId: string,
  sequence: number,
  timestamp: string,
  reason: string,
  version: number,
): string {
  const components = [
    kind,
    term ?? '',
    documentId,
    sequence.toString(),
    timestampToNanoseconds(timestamp).toString(),
    reason,
    version.toString(),
  ];
  return createHash('sha256').update(components.join('|')).digest('hex');
}

export function validateProof(proof: Proof, snapshot: IndexSnapshot): void {
  if (proof.version > snapshot.version) {
    throw new Error(`proof version ${proof.version} is ahead of snapshot ${snapshot.version}`);
  }

  if (proof.kind === 'document') {
    const stillPresent = snapshot.documents.some((doc) => doc.id === proof.documentId);
    if (stillPresent) {
      throw new Error(`document ${proof.documentId} still present in snapshot`);
    }
    const tombstone = snapshot.documentTombstones.find((ts) => ts.documentId === proof.documentId);
    if (!tombstone) {
      throw new Error(`no tombstone for document ${proof.documentId}`);
    }
    const expected = digestFor(
      'document',
      tombstone.term,
      tombstone.documentId,
      tombstone.sequence,
      tombstone.timestamp,
      tombstone.reason,
      tombstone.version,
    );
    if (expected !== tombstone.digest) {
      throw new Error(`digest mismatch for document ${proof.documentId}`);
    }
  } else {
    if (!proof.term) {
      throw new Error('term proof requires term');
    }
    const posting = snapshot.inverted.find((entry) => entry.term === proof.term);
    if (posting && posting.documents.includes(proof.documentId)) {
      throw new Error(`term ${proof.term} still linked to document ${proof.documentId}`);
    }
    const group = snapshot.termTombstones.find((entry) => entry.term === proof.term);
    const tombstone = group?.tombstones.find((ts) => ts.documentId === proof.documentId);
    if (!tombstone) {
      throw new Error(`no tombstone for term ${proof.term} and document ${proof.documentId}`);
    }
    const expected = digestFor(
      'term',
      proof.term,
      proof.documentId,
      tombstone.sequence,
      tombstone.timestamp,
      tombstone.reason,
      tombstone.version,
    );
    if (expected !== tombstone.digest) {
      throw new Error(`digest mismatch for term ${proof.term} and document ${proof.documentId}`);
    }
  }
}

