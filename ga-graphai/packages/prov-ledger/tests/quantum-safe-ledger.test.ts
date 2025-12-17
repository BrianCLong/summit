import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AccessTokenService,
  QuantumSafeLedger,
  computeLedgerHash,
  createSchnorrProof,
  generateHybridKeyPair,
  generateLamportKeyPair,
  generateSchnorrKeyPair,
  signHybrid,
  signWithLamport,
  verifyHybridSignature,
  verifyLamportSignature,
  verifySchnorrProof,
} from '../src/quantum-safe-ledger';

const fixedNow = () => new Date('2024-01-01T00:00:00.000Z');

describe('Lamport one-time signatures', () => {
  it('signs and verifies while detecting tampering', () => {
    const keyPair = generateLamportKeyPair();
    const message = 'classified-digest';

    const signature = signWithLamport(message, keyPair);
    expect(verifyLamportSignature(message, signature, keyPair.publicKey)).toBe(true);

    const altered = { ...signature, signature: [...signature.signature] };
    altered.signature[0] = keyPair.privateKey[0][0];
    expect(verifyLamportSignature(message, altered, keyPair.publicKey)).toBe(false);
  });
});

describe('Schnorr identification proof', () => {
  it('verifies proofs and rejects altered transcripts', () => {
    const identity = generateSchnorrKeyPair();
    const message = 'audit-hash';
    const proof = createSchnorrProof(identity, message);

    expect(verifySchnorrProof(identity.publicKey, message, proof)).toBe(true);
    expect(verifySchnorrProof(identity.publicKey, `${message}-tampered`, proof)).toBe(false);
  });
});

describe('QuantumSafeLedger', () => {
  it('chains entries with hybrid signatures, tokens, and proofs', () => {
    const tokenService = new AccessTokenService('super-secret', { ttlMs: 1_000, now: fixedNow });
    const identity = generateSchnorrKeyPair();
    const ledger = new QuantumSafeLedger(tokenService, {
      now: fixedNow,
      identityPublicKey: identity.publicKey,
    });

    const hybridKeys = generateHybridKeyPair();
    const token = tokenService.issue('alice', 'intel').token;

    const fact = {
      id: '1',
      category: 'intel',
      actor: 'alice',
      action: 'share',
      resource: 'report-42',
      payload: { sensitivity: 'secret' },
    };

    const expectedHash = computeLedgerHash(fact, fixedNow().toISOString());
    const zkProof = createSchnorrProof(identity, expectedHash);
    const signature = signHybrid(expectedHash, hybridKeys);

    const entry = ledger.append(fact, signature, token, zkProof);
    expect(entry.hash).toBe(expectedHash);

    const secondFact = {
      ...fact,
      id: '2',
      resource: 'report-43',
      payload: { sensitivity: 'secret', revision: 2 },
    };
    const secondHash = computeLedgerHash(secondFact, fixedNow().toISOString(), entry.hash);
    const secondProof = createSchnorrProof(identity, secondHash);
    const secondSignature = signHybrid(secondHash, hybridKeys);

    const chained = ledger.append(secondFact, secondSignature, token, secondProof);
    expect(chained.previousHash).toBe(entry.hash);

    expect(ledger.verifyChain()).toBe(true);

    // Tamper with the chain hash and expect verification to fail.
    const tampered = { ...chained, chainHash: `${chained.chainHash.slice(0, -1)}0` };
    // @ts-expect-error intentional tampering for validation purposes
    ledger['entries'][1] = tampered;
    expect(ledger.verifyChain()).toBe(false);
  });

  it('rejects hybrid signature tampering', () => {
    const tokenService = new AccessTokenService('another-secret', { now: fixedNow });
    const ledger = new QuantumSafeLedger(tokenService, { now: fixedNow });
    const hybridKeys = generateHybridKeyPair();
    const token = tokenService.issue('bob', 'intel').token;

    const fact = {
      id: 't1',
      category: 'intel',
      actor: 'bob',
      action: 'access',
      resource: 'dataset',
      payload: { classification: 'top-secret' },
    };

    const expectedHash = computeLedgerHash(fact, fixedNow().toISOString());
    const signature = signHybrid(expectedHash, hybridKeys);

    ledger.append(fact, signature, token);
    expect(ledger.verifyChain()).toBe(true);

    const forgedSignature = {
      ...signature,
      ed25519Signature: signature.ed25519Signature.replace(/.$/, 'A'),
    };
    expect(verifyHybridSignature(expectedHash, forgedSignature)).toBe(false);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
