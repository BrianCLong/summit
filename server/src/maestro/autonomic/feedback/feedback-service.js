"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const crypto_1 = require("crypto");
class FeedbackService {
    feedbackStore = [];
    ingestFeedback(event) {
        const fullEvent = {
            ...event,
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date()
        };
        this.feedbackStore.push(fullEvent);
        // In prod: persist to DB, trigger async learning jobs
        return fullEvent;
    }
    getAgentSummary(agentId) {
        const events = this.feedbackStore.filter(e => e.target.agentId === agentId);
        // Ratings
        const ratings = events.filter(e => e.type === 'RATING_1_5').map(e => e.value);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        // Thumbs
        const thumbs = events.filter(e => e.type === 'THUMBS').map(e => e.value);
        const positiveRate = thumbs.length > 0 ? thumbs.filter(t => t).length / thumbs.length : 0;
        // Comments
        const comments = events
            .filter(e => e.type === 'TEXT' || e.type === 'CORRECTION')
            .map(e => String(e.value))
            .slice(-5); // Last 5
        return {
            agentId,
            avgRating,
            positiveRate,
            sampleSize: events.length,
            recentComments: comments
        };
    }
}
exports.FeedbackService = FeedbackService;
