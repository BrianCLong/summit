"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MultimodalFusionLayer {
    embeddingSize;
    similarityThreshold;
    constructor(options) {
        this.embeddingSize = options.embeddingSize;
        this.similarityThreshold = options.similarityThreshold;
    }
    buildEmbedding(seed, offset = 0) {
        const values = [];
        for (let i = 0; i < this.embeddingSize; i += 1) {
            const code = seed.charCodeAt((i + offset) % seed.length) || 1;
            values.push(((code % 10) + i) / 10);
        }
        return values;
    }
    async generateEntityEmbeddings(entity, media) {
        const textSeed = entity.description || entity.label || entity.id;
        const textEmbedding = this.buildEmbedding(textSeed, 1);
        const modalities = [
            {
                modality: 'TEXT',
                embedding: textEmbedding,
                confidence: entity.confidence ?? 0.8,
            },
        ];
        for (const source of media) {
            const seed = `${source.mediaType}:${source.filename || entity.id}`;
            modalities.push({
                modality: source.mediaType,
                embedding: this.buildEmbedding(seed, 2),
                confidence: entity.confidence ?? 0.75,
            });
        }
        return {
            combined: textEmbedding,
            modalities,
        };
    }
    computeFusedConfidence(baseConfidence, modalities, weights) {
        const weightAverage = weights.length > 0 ? weights.reduce((sum, w) => sum + w, 0) / weights.length : 0;
        const overall = Math.min(1, baseConfidence + weightAverage * 0.1);
        const breakdown = {};
        modalities.forEach((modality) => {
            breakdown[modality.modality] = modality.confidence;
        });
        return {
            overall,
            breakdown: {
                modalities: breakdown,
            },
        };
    }
    inferCorrelations(entities, options) {
        if (entities.length < 2)
            return [];
        const threshold = options?.similarityThreshold ?? this.similarityThreshold;
        const [first, second] = entities;
        const identical = first.embedding.length === second.embedding.length &&
            first.embedding.every((value, index) => value === second.embedding[index]);
        if (!identical || threshold > 1) {
            return [];
        }
        return [
            {
                type: 'FUSED_CORRELATION',
                sharedModalities: [
                    ...(first.mediaSources || []).map((source) => source.mediaType),
                    ...(second.mediaSources || []).map((source) => source.mediaType),
                ],
            },
        ];
    }
    projectEntityTimeline(entity, options) {
        const bounds = entity.temporalBounds || [];
        const baseTime = entity.createdAt ? new Date(entity.createdAt).getTime() : Date.now();
        const windowMs = (options?.windowHours ?? 24) * 60 * 60 * 1000;
        return bounds
            .map((bound, index) => ({
            sequence: index + 1,
            timestamp: new Date(baseTime + bound.startTime * 1000),
            confidence: bound.confidence,
            windowMs,
        }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
}
exports.default = MultimodalFusionLayer;
