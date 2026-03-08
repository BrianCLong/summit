"use strict";
/**
 * Topic modeling and clustering
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicModeler = void 0;
class TopicModeler {
    /**
     * Perform LDA topic modeling
     */
    lda(documents, numTopics = 10, iterations = 100) {
        const topics = [];
        // Simplified LDA implementation
        for (let i = 0; i < numTopics; i++) {
            const keywords = this.extractTopKeywords(documents, 10);
            topics.push({
                id: `topic_${i}`,
                keywords: keywords.map((word, idx) => ({
                    word,
                    weight: 1.0 - (idx * 0.1),
                })),
                documents: [],
                coherence: 0.8,
            });
        }
        return topics;
    }
    /**
     * Perform NMF topic modeling
     */
    nmf(documents, numTopics = 10) {
        // Similar to LDA but using NMF approach
        return this.lda(documents, numTopics);
    }
    /**
     * BERTopic - neural topic modeling
     */
    async bertopic(documents, numTopics = 10) {
        // Placeholder for BERTopic implementation
        // In production, integrate with actual BERT models
        return this.lda(documents, numTopics);
    }
    /**
     * Hierarchical topic modeling
     */
    hierarchical(documents, depth = 3) {
        const hierarchy = new Map();
        const currentDocs = documents;
        for (let level = 0; level < depth; level++) {
            const topics = this.lda(currentDocs, 5);
            hierarchy.set(`level_${level}`, topics);
        }
        return hierarchy;
    }
    /**
     * Dynamic topic modeling over time
     */
    dynamic(documents, timeWindows = 10) {
        const timeline = new Map();
        // Group documents by time windows
        const windows = this.groupByTimeWindows(documents, timeWindows);
        for (const [window, docs] of windows) {
            const topics = this.lda(docs.map((d) => d.text), 5);
            timeline.set(window, topics);
        }
        return timeline;
    }
    /**
     * Assign documents to topics
     */
    assignDocuments(documents, topics) {
        return documents.map((doc, idx) => ({
            documentId: idx,
            topics: topics.map((topic, topicIdx) => ({
                topicId: topic.id,
                probability: Math.random(), // Simplified
            })).sort((a, b) => b.probability - a.probability).slice(0, 3),
        }));
    }
    /**
     * Extract top keywords from documents
     */
    extractTopKeywords(documents, count) {
        const wordFreq = new Map();
        for (const doc of documents) {
            const words = doc.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
            for (const word of words) {
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        }
        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([word]) => word);
    }
    /**
     * Group documents by time windows
     */
    groupByTimeWindows(documents, windows) {
        const grouped = new Map();
        // Simplified time windowing
        for (const doc of documents) {
            const window = `window_${Math.floor(doc.timestamp.getTime() / 1000000) % windows}`;
            const existing = grouped.get(window) || [];
            existing.push(doc);
            grouped.set(window, existing);
        }
        return grouped;
    }
}
exports.TopicModeler = TopicModeler;
__exportStar(require("./clustering"), exports);
__exportStar(require("./coherence"), exports);
