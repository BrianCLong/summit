"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfConsensusEngine = void 0;
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;
class SelfConsensusEngine {
    similarity;
    similarityThreshold;
    constructor(similarity, threshold = DEFAULT_SIMILARITY_THRESHOLD) {
        this.similarity = similarity;
        this.similarityThreshold = threshold;
    }
    async generateConsensus(options) {
        const embeddings = [];
        const outputs = [];
        for (let index = 0; index < options.variants; index += 1) {
            const text = await options.generator(options.prompt, index);
            outputs.push(text);
            embeddings.push(await options.embed(text));
        }
        const clusters = [];
        for (let index = 0; index < outputs.length; index += 1) {
            const embedding = embeddings[index];
            const text = outputs[index];
            let assigned = false;
            for (const cluster of clusters) {
                const similarity = this.similarity(cluster.centroid, embedding);
                if (similarity >= this.similarityThreshold) {
                    cluster.members.push(text);
                    cluster.centroid = this.recalculateCentroid(cluster.centroid, embedding, cluster.members.length);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                clusters.push({ centroid: embedding.slice(), members: [text] });
            }
        }
        const bestCluster = clusters.reduce((largest, cluster) => cluster.members.length > largest.members.length ? cluster : largest);
        const consensus = bestCluster.members[0] ?? '';
        return { consensus, clusters };
    }
    recalculateCentroid(existing, incoming, count) {
        const length = Math.min(existing.length, incoming.length);
        const result = [];
        for (let index = 0; index < length; index += 1) {
            const updated = (existing[index] * (count - 1) + incoming[index]) / count;
            result.push(updated);
        }
        return result;
    }
}
exports.SelfConsensusEngine = SelfConsensusEngine;
