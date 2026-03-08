"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Relationship = void 0;
class Relationship {
    sourceId;
    targetId;
    type;
    intensity;
    trust;
    constructor(options) {
        this.sourceId = options.sourceId;
        this.targetId = options.targetId;
        this.type = options.type ?? 'neutral';
        this.intensity = Math.max(0, Math.min(1, options.intensity ?? 0.5));
        this.trust = Math.max(0, Math.min(1, options.trust ?? 0.5));
    }
    adjustTrust(delta) {
        this.trust = Math.max(0, Math.min(1, this.trust + delta));
        return this.trust;
    }
    adjustIntensity(delta) {
        this.intensity = Math.max(0, Math.min(1, this.intensity + delta));
        return this.intensity;
    }
    influenceFromMood(mood) {
        const direction = this.type === 'ally' || this.type === 'family'
            ? 1
            : this.type === 'rival'
                ? -1
                : 0.25;
        const scaled = mood * this.intensity * this.trust * direction;
        return Math.max(-5, Math.min(5, scaled));
    }
    clone() {
        return new Relationship({
            sourceId: this.sourceId,
            targetId: this.targetId,
            type: this.type,
            intensity: this.intensity,
            trust: this.trust,
        });
    }
    snapshot() {
        return {
            sourceId: this.sourceId,
            targetId: this.targetId,
            type: this.type,
            intensity: this.intensity,
            trust: this.trust,
        };
    }
}
exports.Relationship = Relationship;
