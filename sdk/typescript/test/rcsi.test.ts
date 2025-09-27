import fs from 'node:fs';
import path from 'node:path';

import { digestFor, validateProof } from '../src/rcsi/proof';
import type { Proof } from '../src/rcsi/types';

function loadSnapshot() {
  const file = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'services',
    'rcsi',
    'internal',
    'index',
    'testdata',
    'index_snapshot.json',
  );
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('RCSI snapshot compatibility', () => {
  const snapshot = loadSnapshot();

  it('validates document proofs against the snapshot', () => {
    const tombstone = snapshot.documentTombstones.find((ts: any) => ts.documentId === 'doc-003');
    expect(tombstone).toBeDefined();
    if (!tombstone) {
      return;
    }
    const proof: Proof = {
      kind: 'document',
      documentId: tombstone.documentId,
      query: tombstone.documentId,
      tombstone,
      version: snapshot.version,
    };
    expect(() => validateProof(proof, snapshot)).not.toThrow();
    expect(
      digestFor(
        'document',
        tombstone.term,
        tombstone.documentId,
        tombstone.sequence,
        tombstone.timestamp,
        tombstone.reason,
        tombstone.version,
      ),
    ).toEqual(tombstone.digest);
  });

  it('validates term proofs against the snapshot', () => {
    const group = snapshot.termTombstones.find((entry: any) => entry.term === 'erasure');
    expect(group).toBeDefined();
    if (!group) {
      return;
    }
    const tombstone = group.tombstones[0];
    const proof: Proof = {
      kind: 'term',
      term: group.term,
      documentId: tombstone.documentId,
      query: `${group.term}#${tombstone.documentId}`,
      tombstone,
      version: snapshot.version,
    };
    expect(() => validateProof(proof, snapshot)).not.toThrow();
  });

  it('rejects tampered proofs', () => {
    const tombstone = snapshot.documentTombstones[0];
    const proof: Proof = {
      kind: 'document',
      documentId: 'doc-001',
      query: 'doc-001',
      tombstone,
      version: snapshot.version,
    };
    expect(() => validateProof(proof, snapshot)).toThrow();
  });
});

