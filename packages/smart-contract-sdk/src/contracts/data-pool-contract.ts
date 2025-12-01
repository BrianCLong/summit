/**
 * Data Pool Contract - Manages on-chain data pool state
 */

import type {
  ContractConfig,
  TransactionReceipt,
  DataPoolState,
} from '../types.js';
import { BaseContract } from './base-contract.js';

export class DataPoolContract extends BaseContract {
  constructor(config: ContractConfig) {
    super(config);
  }

  async createPool(
    poolId: string,
    merkleRoot: string,
    metadata: string,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('createPool', [poolId, merkleRoot, metadata]);
  }

  async getPoolState(poolId: string): Promise<DataPoolState> {
    const result = await this.call('getPoolState', [poolId]);
    return {
      poolId: result.poolId,
      owner: result.owner,
      merkleRoot: result.merkleRoot,
      contributorCount: Number(result.contributorCount),
      totalContributions: Number(result.totalContributions),
      createdAt: Number(result.createdAt),
      lastUpdated: Number(result.lastUpdated),
      paused: result.paused,
    };
  }

  async updateMerkleRoot(
    poolId: string,
    newRoot: string,
    proof: string[],
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('updateMerkleRoot', [poolId, newRoot, proof]);
  }

  async addContributor(
    poolId: string,
    contributorAddress: string,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('addContributor', [poolId, contributorAddress]);
  }

  async removeContributor(
    poolId: string,
    contributorAddress: string,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('removeContributor', [poolId, contributorAddress]);
  }

  async verifyContribution(
    poolId: string,
    contentHash: string,
    proof: string[],
  ): Promise<boolean> {
    return this.call('verifyContribution', [poolId, contentHash, proof]);
  }

  async pausePool(poolId: string): Promise<TransactionReceipt> {
    return this.sendTransaction('pausePool', [poolId]);
  }

  async unpausePool(poolId: string): Promise<TransactionReceipt> {
    return this.sendTransaction('unpausePool', [poolId]);
  }

  async transferOwnership(
    poolId: string,
    newOwner: string,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('transferOwnership', [poolId, newOwner]);
  }
}
