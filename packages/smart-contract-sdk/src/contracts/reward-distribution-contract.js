"use strict";
/**
 * Reward Distribution Contract - Manages contributor rewards
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardDistributionContract = void 0;
const base_contract_js_1 = require("./base-contract.js");
class RewardDistributionContract extends base_contract_js_1.BaseContract {
    constructor(config) {
        super(config);
    }
    async distributeRewards(poolId, epoch, rewards) {
        return this.sendTransaction('distributeRewards', [poolId, epoch, rewards]);
    }
    async claimReward(poolId, epoch) {
        return this.sendTransaction('claimReward', [poolId, epoch]);
    }
    async getPendingRewards(contributor, poolId) {
        return this.call('getPendingRewards', [contributor, poolId]);
    }
    async getRewardHistory(contributor, poolId) {
        const rewards = await this.call('getRewardHistory', [contributor, poolId]);
        return rewards.map((r) => ({
            contributorId: r.contributorId,
            poolId: r.poolId,
            amount: BigInt(r.amount),
            claimed: r.claimed,
            epoch: Number(r.epoch),
        }));
    }
    async setRewardRate(poolId, ratePerContribution) {
        return this.sendTransaction('setRewardRate', [poolId, ratePerContribution]);
    }
    async getPoolRewardStats(poolId) {
        const stats = await this.call('getPoolRewardStats', [poolId]);
        return {
            totalDistributed: BigInt(stats.totalDistributed),
            totalClaimed: BigInt(stats.totalClaimed),
            currentEpoch: Number(stats.currentEpoch),
        };
    }
    async batchClaimRewards(claims) {
        return this.sendTransaction('batchClaimRewards', [claims]);
    }
}
exports.RewardDistributionContract = RewardDistributionContract;
