/**
 * Reward Distribution Contract - Manages contributor rewards
 */

import type {
  ContractConfig,
  TransactionReceipt,
  ContributorReward,
} from '../types.js';
import { BaseContract } from './base-contract.js';

export class RewardDistributionContract extends BaseContract {
  constructor(config: ContractConfig) {
    super(config);
  }

  async distributeRewards(
    poolId: string,
    epoch: number,
    rewards: Array<{ contributor: string; amount: bigint }>,
  ): Promise<TransactionReceipt> {
    return this.sendTransaction('distributeRewards', [poolId, epoch, rewards]);
  }

  async claimReward(poolId: string, epoch: number): Promise<TransactionReceipt> {
    return this.sendTransaction('claimReward', [poolId, epoch]);
  }

  async getPendingRewards(contributor: string, poolId: string): Promise<bigint> {
    return this.call('getPendingRewards', [contributor, poolId]);
  }

  async getRewardHistory(
    contributor: string,
    poolId: string,
  ): Promise<ContributorReward[]> {
    const rewards = await this.call('getRewardHistory', [contributor, poolId]);
    return rewards.map((r: any) => ({
      contributorId: r.contributorId,
      poolId: r.poolId,
      amount: BigInt(r.amount),
      claimed: r.claimed,
      epoch: Number(r.epoch),
    }));
  }

  async setRewardRate(poolId: string, ratePerContribution: bigint): Promise<TransactionReceipt> {
    return this.sendTransaction('setRewardRate', [poolId, ratePerContribution]);
  }

  async getPoolRewardStats(poolId: string): Promise<{
    totalDistributed: bigint;
    totalClaimed: bigint;
    currentEpoch: number;
  }> {
    const stats = await this.call('getPoolRewardStats', [poolId]);
    return {
      totalDistributed: BigInt(stats.totalDistributed),
      totalClaimed: BigInt(stats.totalClaimed),
      currentEpoch: Number(stats.currentEpoch),
    };
  }

  async batchClaimRewards(claims: Array<{ poolId: string; epoch: number }>): Promise<TransactionReceipt> {
    return this.sendTransaction('batchClaimRewards', [claims]);
  }
}
