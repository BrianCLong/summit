"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationEngine = void 0;
class CorrelationEngine {
    correlate(input) {
        const { event, behavior, patterns = [], indicators = [] } = input;
        if (!behavior && patterns.length === 0 && indicators.length === 0) {
            return undefined;
        }
        const relatedEntities = new Set();
        if (event.context?.sessionId) {
            relatedEntities.add(event.context.sessionId);
        }
        if (event.context?.ip) {
            relatedEntities.add(event.context.ip);
        }
        const strength = this.calculateStrength(behavior, patterns, indicators);
        return {
            entityId: event.entityId,
            indicators,
            relatedEntities: [...relatedEntities],
            strength,
            notes: this.buildNotes(behavior, patterns, indicators),
        };
    }
    calculateStrength(behavior, patterns = [], indicators = []) {
        const behaviorScore = behavior?.score ?? 0;
        const patternScore = patterns.reduce((sum, pattern) => sum + pattern.weight, 0);
        const intelConfidence = indicators.reduce((sum, indicator) => sum + indicator.confidence, 0);
        const normalizedIntel = intelConfidence / Math.max(indicators.length, 1);
        return Number(Math.min(behaviorScore + patternScore + normalizedIntel * 0.01, 1).toFixed(2));
    }
    buildNotes(behavior, patterns = [], indicators = []) {
        const notes = [];
        if (behavior) {
            notes.push(...behavior.rationale);
        }
        for (const pattern of patterns) {
            notes.push(`pattern match: ${pattern.pattern}`);
        }
        for (const indicator of indicators) {
            notes.push(`intel hit: ${indicator.type}:${indicator.value} (${indicator.source})`);
        }
        return notes;
    }
}
exports.CorrelationEngine = CorrelationEngine;
