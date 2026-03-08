"use strict";
/**
 * Aspect-based sentiment analysis
 * Extracts specific aspects and their associated sentiments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AspectBasedAnalyzer = void 0;
class AspectBasedAnalyzer {
    sentimentModel;
    constructor(sentimentModel) {
        this.sentimentModel = sentimentModel;
    }
    async analyzeAspects(text) {
        // Extract aspects (nouns and noun phrases)
        const aspects = this.extractAspects(text);
        if (aspects.length === 0) {
            return [];
        }
        const aspectSentiments = [];
        // Analyze sentiment for each aspect
        for (const aspect of aspects) {
            const aspectContext = this.getAspectContext(text, aspect);
            const sentiment = await this.sentimentModel.analyzeSentiment(aspectContext);
            aspectSentiments.push({
                aspect,
                sentiment,
                confidence: this.calculateConfidence(sentiment),
                mentions: this.countMentions(text, aspect),
            });
        }
        return aspectSentiments;
    }
    extractAspects(text) {
        // Simple noun extraction (in production, use NLP library like compromise)
        const words = text.toLowerCase().split(/\s+/);
        const aspects = new Set();
        // Common domain-specific aspects for intelligence analysis
        const domainAspects = [
            'threat',
            'risk',
            'security',
            'intelligence',
            'operation',
            'attack',
            'defense',
            'vulnerability',
            'target',
            'source',
            'credibility',
            'reliability',
            'accuracy',
            'timeliness',
        ];
        for (const word of words) {
            const cleanWord = word.replace(/[^\w]/g, '');
            if (domainAspects.includes(cleanWord)) {
                aspects.add(cleanWord);
            }
        }
        return Array.from(aspects);
    }
    getAspectContext(text, aspect, windowSize = 50) {
        const lowerText = text.toLowerCase();
        const aspectIndex = lowerText.indexOf(aspect);
        if (aspectIndex === -1) {
            return text;
        }
        const start = Math.max(0, aspectIndex - windowSize);
        const end = Math.min(text.length, aspectIndex + aspect.length + windowSize);
        return text.substring(start, end);
    }
    countMentions(text, aspect) {
        const lowerText = text.toLowerCase();
        const regex = new RegExp(aspect, 'gi');
        const matches = lowerText.match(regex);
        return matches ? matches.length : 0;
    }
    calculateConfidence(sentiment) {
        // Confidence based on how decisive the sentiment is
        const maxScore = Math.max(sentiment.positive, sentiment.negative, sentiment.neutral);
        return maxScore;
    }
}
exports.AspectBasedAnalyzer = AspectBasedAnalyzer;
