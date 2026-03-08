"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const SecureFusionService_js_1 = __importDefault(require("./SecureFusionService.js"));
/**
 * OSINTAggregator
 *
 * Manages the ingestion of OSINT streams with "Adaptive Prioritization".
 * Simulates the patentable prioritization logic mentioned in the prompt.
 */
class OSINTAggregator {
    fusionService;
    logger;
    queue;
    priorityRules;
    constructor(fusionService) {
        this.fusionService = fusionService || new SecureFusionService_js_1.default();
        this.logger = logger_js_1.default;
        // Priority Queue (In-memory for prototype)
        // Structure: Array of { item, score, timestamp }
        this.queue = [];
        // "Patentable" Prioritization Rules Configuration
        this.priorityRules = {
            keywords: ['nuclear', 'missile', 'cyber', 'biolabs', 'deployment'],
            highValueSources: ['satellite-feed-alpha', 'intercept-x', 'human-asset-1'],
            decayFactor: 0.1 // Score decays over time to prevent starvation
        };
    }
    /**
     * Ingest a raw item from a stream.
     * Calculates priority score and adds to queue.
     */
    async ingest(item, sourceId) {
        const enrichedItem = {
            ...item,
            sourceId,
            ingestedAt: new Date()
        };
        const score = this.calculatePriorityScore(enrichedItem);
        this.queue.push({
            item: enrichedItem,
            score,
            timestamp: Date.now()
        });
        // Sort queue by score (descending)
        this.queue.sort((a, b) => b.score - a.score);
        this.logger.debug(`Ingested item from ${sourceId} with score ${score}`);
        // Trigger processing (in a real system this would be a worker loop)
        // For prototype, we verify if we should process immediately or batch
        return { status: 'queued', position: this.queue.length, score };
    }
    /**
     * Calculates a priority score based on "Adaptive Prioritization" logic.
     * This is the "secret sauce" algorithm.
     */
    calculatePriorityScore(item) {
        let score = 0;
        const content = (item.text || item.summary || item.label || '').toLowerCase();
        // 1. Keyword Boosting
        this.priorityRules.keywords.forEach(kw => {
            if (content.includes(kw))
                score += 10;
        });
        // 2. Source Credibility Boosting
        if (this.priorityRules.highValueSources.includes(item.sourceId)) {
            score += 20;
        }
        // 3. Modality Weighting (Images/Signals might be higher priority for fusion)
        if (item.type === 'image')
            score += 5;
        if (item.type === 'signal')
            score += 15; // Signals are fleeting, high priority
        // 4. Uncertainty / Novelty (Simulated)
        // If we haven't seen this source in a while, boost it?
        // For now, random noise to simulate 'entropy'
        score += Math.random() * 5;
        return score;
    }
    /**
     * Process the top N items from the queue.
     */
    async processQueue(batchSize = 1) {
        const results = [];
        // Take top items
        const batch = this.queue.splice(0, batchSize);
        for (const entry of batch) {
            try {
                this.logger.info(`Processing high-priority item (score: ${entry.score.toFixed(2)})`);
                const result = await this.fusionService.fuse(entry.item);
                results.push({ item: entry.item, result, status: 'processed' });
            }
            catch (e) {
                this.logger.error('Failed to process item', e);
                results.push({ item: entry.item, error: e.message, status: 'failed' });
            }
        }
        return results;
    }
    /**
     * Get queue stats
     */
    getStats() {
        return {
            queueLength: this.queue.length,
            highestScore: this.queue.length > 0 ? this.queue[0].score : 0
        };
    }
}
exports.default = OSINTAggregator;
