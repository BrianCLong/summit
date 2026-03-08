"use strict";
/**
 * Data Pool Contract - Manages on-chain data pool state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataPoolContract = void 0;
const base_contract_js_1 = require("./base-contract.js");
class DataPoolContract extends base_contract_js_1.BaseContract {
    constructor(config) {
        super(config);
    }
    async createPool(poolId, merkleRoot, metadata) {
        return this.sendTransaction('createPool', [poolId, merkleRoot, metadata]);
    }
    async getPoolState(poolId) {
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
    async updateMerkleRoot(poolId, newRoot, proof) {
        return this.sendTransaction('updateMerkleRoot', [poolId, newRoot, proof]);
    }
    async addContributor(poolId, contributorAddress) {
        return this.sendTransaction('addContributor', [poolId, contributorAddress]);
    }
    async removeContributor(poolId, contributorAddress) {
        return this.sendTransaction('removeContributor', [poolId, contributorAddress]);
    }
    async verifyContribution(poolId, contentHash, proof) {
        return this.call('verifyContribution', [poolId, contentHash, proof]);
    }
    async pausePool(poolId) {
        return this.sendTransaction('pausePool', [poolId]);
    }
    async unpausePool(poolId) {
        return this.sendTransaction('unpausePool', [poolId]);
    }
    async transferOwnership(poolId, newOwner) {
        return this.sendTransaction('transferOwnership', [poolId, newOwner]);
    }
}
exports.DataPoolContract = DataPoolContract;
