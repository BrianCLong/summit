import { describe, it, expect, beforeEach } from 'vitest';
import { BallotLedger } from '../src/blockchain/ballot-ledger.js';
import type { EncryptedBallot } from '../src/types/election.js';

describe('BallotLedger', () => {
  let ledger: BallotLedger;

  beforeEach(() => {
    ledger = new BallotLedger(2, 10); // Lower difficulty for faster tests
  });

  const createBallot = (id: string): EncryptedBallot => ({
    ballotId: id,
    electionId: 'election-1',
    encryptedPayload: `encrypted-vote-${id}`,
    voterProof: `proof-${id}`,
    timestamp: new Date().toISOString(),
  });

  describe('recordBallot', () => {
    it('should record a valid ballot', () => {
      const ballot = createBallot('ballot-001');
      const result = ledger.recordBallot(ballot);

      expect(result.success).toBe(true);
      expect(result.position).toBeGreaterThan(0);
    });

    it('should reject duplicate ballot IDs', () => {
      const ballot = createBallot('ballot-dup');
      ledger.recordBallot(ballot);

      expect(() => ledger.recordBallot(ballot)).toThrow('Duplicate ballot detected');
    });

    it('should reject invalid ballot structure', () => {
      const invalidBallot = { ballotId: '', encryptedPayload: '', voterProof: '' } as EncryptedBallot;

      expect(() => ledger.recordBallot(invalidBallot)).toThrow('Invalid ballot structure');
    });
  });

  describe('mineBlock', () => {
    it('should mine pending ballots into a block', () => {
      ledger.recordBallot(createBallot('ballot-1'));
      ledger.recordBallot(createBallot('ballot-2'));

      const block = ledger.mineBlock();

      expect(block).not.toBeNull();
      expect(block!.index).toBe(1);
      expect(block!.ballots).toHaveLength(2);
      expect(block!.hash).toMatch(/^0{2}/); // Matches difficulty
    });

    it('should return null when no pending ballots', () => {
      const block = ledger.mineBlock();
      expect(block).toBeNull();
    });
  });

  describe('verifyChain', () => {
    it('should verify a valid chain', () => {
      ledger.recordBallot(createBallot('ballot-v1'));
      ledger.mineBlock();
      ledger.recordBallot(createBallot('ballot-v2'));
      ledger.mineBlock();

      const result = ledger.verifyChain();

      expect(result.valid).toBe(true);
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt for recorded ballot', () => {
      const ballot = createBallot('ballot-receipt');
      ledger.recordBallot(ballot);
      ledger.mineBlock();

      const receipt = ledger.generateReceipt('ballot-receipt');

      expect(receipt.found).toBe(true);
      expect(receipt.blockIndex).toBe(1);
      expect(receipt.ballotHash).toBeDefined();
      expect(receipt.merkleProof).toBeDefined();
    });

    it('should return not found for unknown ballot', () => {
      const receipt = ledger.generateReceipt('unknown-ballot');
      expect(receipt.found).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      ledger.recordBallot(createBallot('stat-1'));
      ledger.recordBallot(createBallot('stat-2'));
      ledger.mineBlock();

      const stats = ledger.getStats();

      expect(stats.totalBlocks).toBe(2); // Genesis + 1
      expect(stats.totalBallots).toBe(2);
      expect(stats.chainValid).toBe(true);
    });
  });
});
