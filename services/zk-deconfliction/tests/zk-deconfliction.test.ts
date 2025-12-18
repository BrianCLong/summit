import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommitmentGenerator } from '../src/commitment';
import { ZKSetProof } from '../src/proof';
import { AuditLogger } from '../src/audit';

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
