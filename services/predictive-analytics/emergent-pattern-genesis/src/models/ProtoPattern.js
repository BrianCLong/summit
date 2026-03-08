"use strict";
/**
 * Proto-Pattern Model
 * Represents an emerging pattern that is not yet fully formed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtoPatternModel = void 0;
class ProtoPatternModel {
    id;
    patternId;
    confidence;
    completeness;
    detectedAt;
    partialMotif;
    weakSignals;
    expectedPattern;
    evolutionTrajectories;
    status;
    metadata;
    constructor(data) {
        this.id = data.id || this.generateId();
        this.patternId = data.patternId || 'unknown';
        this.confidence = data.confidence || 0;
        this.completeness = data.completeness || 0;
        this.detectedAt = data.detectedAt || new Date();
        this.partialMotif = data.partialMotif || {};
        this.weakSignals = data.weakSignals || [];
        this.expectedPattern = data.expectedPattern;
        this.evolutionTrajectories = data.evolutionTrajectories;
        this.status = data.status || 'detected';
        this.metadata = data.metadata;
    }
    generateId() {
        return `proto_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Calculate structural completeness based on expected pattern
     */
    calculateCompleteness(expectedPattern) {
        if (!expectedPattern) {
            return this.completeness;
        }
        const expected = expectedPattern.features || {};
        const current = this.partialMotif.features || {};
        const expectedKeys = Object.keys(expected);
        const currentKeys = Object.keys(current);
        if (expectedKeys.length === 0) {
            return 0;
        }
        const matchedKeys = expectedKeys.filter((key) => currentKeys.includes(key));
        return matchedKeys.length / expectedKeys.length;
    }
    /**
     * Update confidence based on weak signals
     */
    updateConfidence(weights = { structural: 0.4, temporal: 0.3, precedent: 0.3 }) {
        const structuralScore = this.completeness;
        const temporalScore = this.calculateTemporalConsistency();
        const precedentScore = this.calculateHistoricalPrecedent();
        this.confidence =
            weights.structural * structuralScore +
                weights.temporal * temporalScore +
                weights.precedent * precedentScore;
    }
    /**
     * Calculate temporal consistency of weak signals
     */
    calculateTemporalConsistency() {
        if (this.weakSignals.length < 2) {
            return 0;
        }
        // Sort signals by timestamp
        const sorted = [...this.weakSignals].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        // Calculate trend in signal strength
        let increasingCount = 0;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].strength >= sorted[i - 1].strength) {
                increasingCount++;
            }
        }
        return increasingCount / (sorted.length - 1);
    }
    /**
     * Calculate historical precedent score
     */
    calculateHistoricalPrecedent() {
        // This would compare against historical pattern library
        // For now, return a default value
        return this.metadata?.precedentScore || 0.5;
    }
    /**
     * Add a weak signal
     */
    addWeakSignal(signal) {
        this.weakSignals.push(signal);
        this.updateConfidence();
    }
    /**
     * Check if proto-pattern is viable
     */
    isViable(threshold = 0.5) {
        return this.confidence >= threshold && this.status !== 'extinct';
    }
    /**
     * Evolve status based on confidence and completeness
     */
    evolveStatus() {
        if (this.confidence < 0.3) {
            this.status = 'dormant';
        }
        else if (this.completeness >= 0.8) {
            this.status = 'mature';
        }
        else if (this.weakSignals.length > 0) {
            this.status = 'evolving';
        }
        // Check for extinction (no new signals in last 7 days)
        if (this.weakSignals.length > 0) {
            const lastSignalTime = Math.max(...this.weakSignals.map((s) => s.timestamp.getTime()));
            const daysSinceLastSignal = (Date.now() - lastSignalTime) / (1000 * 60 * 60 * 24);
            if (daysSinceLastSignal > 7) {
                this.status = 'extinct';
            }
        }
    }
    /**
     * Export to JSON
     */
    toJSON() {
        return {
            id: this.id,
            patternId: this.patternId,
            confidence: this.confidence,
            completeness: this.completeness,
            detectedAt: this.detectedAt,
            partialMotif: this.partialMotif,
            weakSignals: this.weakSignals,
            expectedPattern: this.expectedPattern,
            evolutionTrajectories: this.evolutionTrajectories,
            status: this.status,
            metadata: this.metadata,
        };
    }
}
exports.ProtoPatternModel = ProtoPatternModel;
