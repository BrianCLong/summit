"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCogBattleStorage = void 0;
class InMemoryCogBattleStorage {
    artifacts = new Map();
    narratives = new Map();
    beliefs = new Map();
    divergence = [];
    beliefGap = [];
    async putArtifacts(data) {
        data.forEach((item) => this.artifacts.set(item.id, item));
    }
    async putNarratives(data) {
        data.forEach((item) => this.narratives.set(item.id, item));
    }
    async putBeliefs(data) {
        data.forEach((item) => this.beliefs.set(item.id, item));
    }
    async getRealityClaimsByIds(_ids) {
        return [];
    }
    async putLinks(_data) {
        return;
    }
    async putMetrics(data) {
        if (data.divergence) {
            this.divergence = data.divergence;
        }
        if (data.beliefGap) {
            this.beliefGap = data.beliefGap;
        }
    }
    async listTopNarratives(limit) {
        return Array.from(this.narratives.values())
            .sort((a, b) => b.metrics.velocity - a.metrics.velocity)
            .slice(0, limit);
    }
    async listBeliefs(limit) {
        return Array.from(this.beliefs.values()).slice(0, limit);
    }
    async listDivergence(narrativeId) {
        if (!narrativeId) {
            return this.divergence;
        }
        return this.divergence.filter((item) => item.narrativeId === narrativeId);
    }
}
exports.InMemoryCogBattleStorage = InMemoryCogBattleStorage;
