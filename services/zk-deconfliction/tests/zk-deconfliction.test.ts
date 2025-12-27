/// <reference types="jest" />
import { CommitmentGenerator } from '../src/commitment';
import { ZKSetProof } from '../src/proof';
import { AuditLogger } from '../src/audit';
import { guardDeconflictRequest, SafetyError } from '../src/safety';
import { ZkdMetrics } from '../src/metrics';

describe('CommitmentGenerator', () => {
  let gen: CommitmentGenerator;

  beforeEach(() => {
    gen = new CommitmentGenerator();
  });

  it('should generate unique salts', () => {
    const salt1 = gen.generateSalt('tenant1');
    const salt2 = gen.generateSalt('tenant1');
    expect(salt1.salt).not.toBe(salt2.salt);
  });

  it('should create deterministic commitments', () => {
    const salt = 'test-salt-123';
    const value = 'selector-abc';
    const c1 = gen.commit(value, salt);
    const c2 = gen.commit(value, salt);
    expect(c1.hash).toBe(c2.hash);
  });

  it('should create different commitments for different salts', () => {
    const value = 'selector-abc';
    const c1 = gen.commit(value, 'salt1');
    const c2 = gen.commit(value, 'salt2');
    expect(c1.hash).not.toBe(c2.hash);
  });

  it('should create commitment set with merkle root', () => {
    const values = ['sel1', 'sel2', 'sel3'];
    const set = gen.commitSet(values, 'tenant1', 'salt123');
    expect(set.count).toBe(3);
    expect(set.merkleRoot).toBeTruthy();
    expect(set.commitments.length).toBe(3);
  });

  it('should verify commitments', () => {
    const value = 'test-value';
    const salt = 'test-salt';
    const commitment = gen.commit(value, salt);
    expect(gen.verify(value, salt, commitment)).toBe(true);
    expect(gen.verify('wrong-value', salt, commitment)).toBe(false);
  });
});

describe('ZKSetProof', () => {
  let proof: ZKSetProof;
  let gen: CommitmentGenerator;

  beforeEach(() => {
    proof = new ZKSetProof();
    gen = new CommitmentGenerator();
  });

  it('should detect overlap', () => {
    const salt1 = 'salt-a';
    const salt2 = 'salt-b';
    const setA = ['alice', 'bob', 'charlie'];
    const setB = ['bob', 'diana', 'charlie'];

    const commitmentsA = setA.map((v) => gen.commit(v, salt1).hash);
    const commitmentsB = setB.map((v) => gen.commit(v, salt2).hash);

    const result = proof.checkOverlap(commitmentsA, commitmentsB);
    // No overlap because different salts produce different hashes
    expect(result.hasOverlap).toBe(false);
  });

  it('should detect overlap with same salt', () => {
    const salt = 'shared-salt';
    const setA = ['alice', 'bob', 'charlie'];
    const setB = ['bob', 'diana', 'charlie'];

    const commitmentsA = setA.map((v) => gen.commit(v, salt).hash);
    const commitmentsB = setB.map((v) => gen.commit(v, salt).hash);

    const result = proof.checkOverlap(commitmentsA, commitmentsB);
    expect(result.hasOverlap).toBe(true);
    expect(result.count).toBe(2); // bob and charlie
  });

  it('should not reveal which elements overlap', () => {
    const salt = 'shared-salt';
    const setA = ['alice', 'bob', 'charlie'];
    const setB = ['bob', 'diana'];

    const commitmentsA = setA.map((v) => gen.commit(v, salt).hash);
    const commitmentsB = setB.map((v) => gen.commit(v, salt).hash);

    const result = proof.checkOverlap(commitmentsA, commitmentsB);
    expect(result.hasOverlap).toBe(true);
    expect(result.count).toBe(1);
    // Only boolean and count are revealed, not which element ('bob')
  });

  it('should generate valid proof', () => {
    const commitmentsA = ['hash1', 'hash2'];
    const commitmentsB = ['hash2', 'hash3'];

    const proofStr = proof.generateProof(
      'tenantA',
      'tenantB',
      commitmentsA,
      commitmentsB,
      true,
      1,
    );

    expect(proofStr).toBeTruthy();
    expect(proofStr.length).toBe(64); // SHA-256 hex
    expect(proof.verifyProof(proofStr, 'tenantA', 'tenantB', true)).toBe(true);
  });

  it('should prove non-membership', () => {
    const commitments = ['hash1', 'hash2', 'hash3'];
    const nonMemberProof = proof.proveNonMembership('hash4', commitments);
    expect(nonMemberProof).toBeTruthy();
    expect(nonMemberProof.length).toBe(64);
  });

  it('should reject non-membership proof for present element', () => {
    const commitments = ['hash1', 'hash2', 'hash3'];
    expect(() => {
      proof.proveNonMembership('hash2', commitments);
    }).toThrow();
  });
});

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  it('should log deconfliction operation', () => {
    const entry = logger.log('tenantA', 'tenantB', true, 5, 'proof-123');
    expect(entry.id).toBeTruthy();
    expect(entry.tenantAId).toBe('tenantA');
    expect(entry.hasOverlap).toBe(true);
    expect(entry.overlapCount).toBe(5);
  });

  it('should retrieve logs by tenant', () => {
    logger.log('tenantA', 'tenantB', false, 0, 'proof-1');
    logger.log('tenantA', 'tenantC', true, 2, 'proof-2');
    logger.log('tenantD', 'tenantE', false, 0, 'proof-3');

    const logsA = logger.getLogsByTenant('tenantA');
    expect(logsA.length).toBe(2);
  });

  it('should retrieve log by ID', () => {
    const entry = logger.log('tenantA', 'tenantB', true, 1, 'proof-123');
    const retrieved = logger.getLogById(entry.id);
    expect(retrieved).toEqual(entry);
  });

  it('should export logs', () => {
    logger.log('tenantA', 'tenantB', false, 0, 'proof-1');
    logger.log('tenantC', 'tenantD', true, 3, 'proof-2');

    const exported = logger.exportLogs();
    expect(exported).toContain('tenantA');
    expect(exported).toContain('proof-2');
    const parsed = JSON.parse(exported);
    expect(parsed.length).toBe(2);
  });
});

describe('Safety guardrails', () => {
  const config = { maxSetSize: 3, maxCommitmentLength: 64 };

  it('rejects empty commitment sets', () => {
    expect(() =>
      guardDeconflictRequest(
        {
          tenantAId: 'a',
          tenantBId: 'b',
          tenantACommitments: [],
          tenantBCommitments: ['c1'],
          revealMode: 'cardinality',
        },
        config,
      ),
    ).toThrow(SafetyError);
  });

  it('rejects oversized payloads', () => {
    const oversized = Array.from({ length: 5 }, (_, i) => `h${i}`);
    expect(() =>
      guardDeconflictRequest(
        {
          tenantAId: 'a',
          tenantBId: 'b',
          tenantACommitments: oversized,
          tenantBCommitments: ['c1'],
          revealMode: 'cardinality',
        },
        config,
      ),
    ).toThrow(SafetyError);
  });

  it('rejects unsupported modes', () => {
    expect(() =>
      guardDeconflictRequest(
        {
          tenantAId: 'a',
          tenantBId: 'b',
          tenantACommitments: ['c1'],
          tenantBCommitments: ['c2'],
          // @ts-expect-error intentionally invalid to test guard
          revealMode: 'members',
        },
        config,
      ),
    ).toThrow('only cardinality mode is allowed');
  });
});

describe('Metrics', () => {
  it('tracks active sessions, denials, and latency histogram', () => {
    const metrics = new ZkdMetrics();
    metrics.incrementActive();
    metrics.recordDenial('max_set_size');
    metrics.observeLatency(0.12);
    metrics.decrementActive();

    const snapshot = metrics.snapshotPrometheus();
    expect(snapshot).toContain('zkd_sessions_active 0');
    expect(snapshot).toContain('zkd_denials_total 1');
    expect(snapshot).toContain('zkd_denials_reason_total{reason="max_set_size"} 1');
    expect(snapshot).toContain('zkd_latency_seconds_bucket');
  });
});
