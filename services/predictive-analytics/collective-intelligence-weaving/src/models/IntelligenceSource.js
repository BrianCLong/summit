"use strict";
/**
 * Intelligence Source Model
 * Represents a source of predictive signals in the collective intelligence system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligenceSourceFactory = exports.SourceType = void 0;
exports.getSourceWeight = getSourceWeight;
exports.isSourceActive = isSourceActive;
var SourceType;
(function (SourceType) {
    SourceType["AGENT"] = "AGENT";
    SourceType["HUMAN"] = "HUMAN";
    SourceType["SENSOR"] = "SENSOR";
    SourceType["SUBSYSTEM"] = "SUBSYSTEM";
    SourceType["EXTERNAL_API"] = "EXTERNAL_API";
    SourceType["ML_MODEL"] = "ML_MODEL";
})(SourceType || (exports.SourceType = SourceType = {}));
class IntelligenceSourceFactory {
    static create(input) {
        const now = new Date();
        return {
            id: crypto.randomUUID(),
            name: input.name,
            type: input.type,
            trustScore: input.initialTrust ?? 0.5,
            reliability: 0.5,
            latency: 0,
            metadata: input.metadata,
            createdAt: now,
            updatedAt: now,
        };
    }
    static validate(source) {
        if (!source.id || !source.name || !source.type) {
            return false;
        }
        if (source.trustScore < 0 || source.trustScore > 1) {
            return false;
        }
        if (source.reliability < 0 || source.reliability > 1) {
            return false;
        }
        return true;
    }
    static updateTrust(source, adjustment) {
        const newTrust = Math.max(0, Math.min(1, source.trustScore + adjustment));
        return {
            ...source,
            trustScore: newTrust,
            updatedAt: new Date(),
        };
    }
    static updateReliability(source, accurateSignals, totalSignals) {
        if (totalSignals === 0)
            return source;
        const newReliability = accurateSignals / totalSignals;
        return {
            ...source,
            reliability: newReliability,
            updatedAt: new Date(),
        };
    }
    static recordLatency(source, latencyMs) {
        // Exponential moving average for latency
        const alpha = 0.3;
        const newLatency = alpha * latencyMs + (1 - alpha) * source.latency;
        return {
            ...source,
            latency: newLatency,
            lastSignal: new Date(),
            updatedAt: new Date(),
        };
    }
}
exports.IntelligenceSourceFactory = IntelligenceSourceFactory;
function getSourceWeight(source) {
    // Combine trust and reliability with latency penalty
    const latencyPenalty = Math.exp(-source.latency / 10000); // Decay over 10s
    return source.trustScore * source.reliability * latencyPenalty;
}
function isSourceActive(source, maxIdleMs = 300000) {
    if (!source.lastSignal)
        return false;
    const idleTime = Date.now() - source.lastSignal.getTime();
    return idleTime < maxIdleMs;
}
