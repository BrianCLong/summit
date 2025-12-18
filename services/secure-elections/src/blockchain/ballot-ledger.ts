import crypto from 'node:crypto';
import type { EncryptedBallot } from '../types/election.js';

/**
 * Blockchain-based Ballot Ledger
 *
 * Implements an immutable, append-only ledger for secure vote recording
 * with cryptographic verification and tamper detection.
 */

export interface BallotBlock {
  index: number;
  timestamp: string;
  ballots: EncryptedBallot[];
  previousHash: string;
  merkleRoot: string;
  nonce: number;
  hash: string;
}

export interface LedgerStats {
  totalBlocks: number;
  totalBallots: number;
  lastBlockTime: string;
  chainValid: boolean;
}

export class BallotLedger {
  private chain: BallotBlock[] = [];
  private pendingBallots: EncryptedBallot[] = [];
  private readonly difficulty: number;
  private readonly maxBallotsPerBlock: number;

  constructor(difficulty = 4, maxBallotsPerBlock = 100) {
    this.difficulty = difficulty;
    this.maxBallotsPerBlock = maxBallotsPerBlock;
    this.initializeGenesisBlock();
  }

  private initializeGenesisBlock(): void {
    const genesis: BallotBlock = {
      index: 0,
      timestamp: new Date().toISOString(),
      ballots: [],
      previousHash: '0'.repeat(64),
      merkleRoot: this.computeMerkleRoot([]),
      nonce: 0,
      hash: '',
    };
    genesis.hash = this.computeBlockHash(genesis);
    this.chain.push(genesis);
  }

  /**
   * Record an encrypted ballot to the pending pool
   */
  recordBallot(ballot: EncryptedBallot): { success: boolean; position: number } {
    // Verify ballot structure
    if (!ballot.ballotId || !ballot.encryptedPayload || !ballot.voterProof) {
      throw new Error('Invalid ballot structure');
    }

    // Check for duplicate ballot IDs
    const isDuplicate = this.chain.some((block) =>
      block.ballots.some((b) => b.ballotId === ballot.ballotId)
    ) || this.pendingBallots.some((b) => b.ballotId === ballot.ballotId);

    if (isDuplicate) {
      throw new Error('Duplicate ballot detected');
    }

    this.pendingBallots.push({
      ...ballot,
      timestamp: new Date().toISOString(),
    });

    // Auto-mine if threshold reached
    if (this.pendingBallots.length >= this.maxBallotsPerBlock) {
      this.mineBlock();
    }

    return {
      success: true,
      position: this.chain.length * this.maxBallotsPerBlock + this.pendingBallots.length,
    };
  }

  /**
   * Mine pending ballots into a new block
   */
  mineBlock(): BallotBlock | null {
    if (this.pendingBallots.length === 0) {
      return null;
    }

    const ballotsToMine = this.pendingBallots.splice(0, this.maxBallotsPerBlock);
    const previousBlock = this.chain[this.chain.length - 1];

    const newBlock: BallotBlock = {
      index: this.chain.length,
      timestamp: new Date().toISOString(),
      ballots: ballotsToMine,
      previousHash: previousBlock.hash,
      merkleRoot: this.computeMerkleRoot(ballotsToMine),
      nonce: 0,
      hash: '',
    };

    // Proof of work
    const target = '0'.repeat(this.difficulty);
    while (!newBlock.hash.startsWith(target)) {
      newBlock.nonce++;
      newBlock.hash = this.computeBlockHash(newBlock);
    }

    // Update ballot block indices
    ballotsToMine.forEach((ballot) => {
      ballot.blockIndex = newBlock.index;
    });

    this.chain.push(newBlock);
    return newBlock;
  }

  /**
   * Verify the integrity of the entire chain
   */
  verifyChain(): { valid: boolean; invalidBlockIndex?: number; reason?: string } {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify previous hash link
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          invalidBlockIndex: i,
          reason: 'Previous hash mismatch',
        };
      }

      // Verify block hash
      const computedHash = this.computeBlockHash(currentBlock);
      if (currentBlock.hash !== computedHash) {
        return {
          valid: false,
          invalidBlockIndex: i,
          reason: 'Block hash tampered',
        };
      }

      // Verify merkle root
      const computedMerkle = this.computeMerkleRoot(currentBlock.ballots);
      if (currentBlock.merkleRoot !== computedMerkle) {
        return {
          valid: false,
          invalidBlockIndex: i,
          reason: 'Merkle root mismatch',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Generate a voter-verifiable receipt
   */
  generateReceipt(ballotId: string): {
    found: boolean;
    blockIndex?: number;
    ballotHash?: string;
    merkleProof?: string[];
  } {
    for (const block of this.chain) {
      const ballotIndex = block.ballots.findIndex((b) => b.ballotId === ballotId);
      if (ballotIndex !== -1) {
        const ballot = block.ballots[ballotIndex];
        return {
          found: true,
          blockIndex: block.index,
          ballotHash: this.hashBallot(ballot),
          merkleProof: this.generateMerkleProof(block.ballots, ballotIndex),
        };
      }
    }
    return { found: false };
  }

  /**
   * Get ledger statistics
   */
  getStats(): LedgerStats {
    const totalBallots = this.chain.reduce(
      (sum, block) => sum + block.ballots.length,
      0
    ) + this.pendingBallots.length;

    return {
      totalBlocks: this.chain.length,
      totalBallots,
      lastBlockTime: this.chain[this.chain.length - 1].timestamp,
      chainValid: this.verifyChain().valid,
    };
  }

  /**
   * Export chain for audit
   */
  exportForAudit(): {
    chainLength: number;
    blocks: Array<{
      index: number;
      hash: string;
      ballotCount: number;
      merkleRoot: string;
    }>;
  } {
    return {
      chainLength: this.chain.length,
      blocks: this.chain.map((block) => ({
        index: block.index,
        hash: block.hash,
        ballotCount: block.ballots.length,
        merkleRoot: block.merkleRoot,
      })),
    };
  }

  private computeBlockHash(block: Omit<BallotBlock, 'hash'> & { hash?: string }): string {
    const data = `${block.index}${block.timestamp}${block.previousHash}${block.merkleRoot}${block.nonce}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private hashBallot(ballot: EncryptedBallot): string {
    const data = `${ballot.ballotId}${ballot.encryptedPayload}${ballot.voterProof}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private computeMerkleRoot(ballots: EncryptedBallot[]): string {
    if (ballots.length === 0) {
      return crypto.createHash('sha256').update('empty').digest('hex');
    }

    let hashes = ballots.map((b) => this.hashBallot(b));

    while (hashes.length > 1) {
      const newHashes: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        newHashes.push(combined);
      }
      hashes = newHashes;
    }

    return hashes[0];
  }

  private generateMerkleProof(ballots: EncryptedBallot[], index: number): string[] {
    const proof: string[] = [];
    let hashes = ballots.map((b) => this.hashBallot(b));
    let idx = index;

    while (hashes.length > 1) {
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (siblingIdx < hashes.length) {
        proof.push(hashes[siblingIdx]);
      }

      const newHashes: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        newHashes.push(
          crypto.createHash('sha256').update(left + right).digest('hex')
        );
      }
      hashes = newHashes;
      idx = Math.floor(idx / 2);
    }

    return proof;
  }
}
