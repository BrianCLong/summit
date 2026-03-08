"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Actor = void 0;
class Actor {
    id;
    name;
    traits;
    mood;
    resilience;
    influence;
    relationships = new Map();
    constructor(options) {
        this.id = options.id;
        this.name = options.name;
        this.traits = options.traits ?? [];
        this.mood = options.mood ?? 0;
        this.resilience = Math.min(Math.max(options.resilience ?? 0.3, 0), 1);
        this.influence = Math.min(Math.max(options.influence ?? 1, 0), 10);
    }
    getMood() {
        return this.mood;
    }
    getResilience() {
        return this.resilience;
    }
    getInfluence() {
        return this.influence;
    }
    adjustMood(delta) {
        const moderated = delta * (1 - this.resilience * 0.5);
        this.mood = Math.max(-10, Math.min(10, this.mood + moderated));
        return this.mood;
    }
    adjustResilience(delta) {
        this.resilience = Math.max(0, Math.min(1, this.resilience + delta));
        return this.resilience;
    }
    adjustInfluence(delta) {
        this.influence = Math.max(0, Math.min(10, this.influence + delta));
        return this.influence;
    }
    addRelationship(relationship) {
        this.relationships.set(relationship.targetId, relationship);
    }
    getRelationship(targetId) {
        return this.relationships.get(targetId);
    }
    getRelationships() {
        return Array.from(this.relationships.values()).map((relationship) => relationship.clone());
    }
    snapshot() {
        return {
            id: this.id,
            name: this.name,
            traits: [...this.traits],
            mood: this.mood,
            resilience: this.resilience,
            influence: this.influence,
            relationships: this.getRelationships(),
        };
    }
}
exports.Actor = Actor;
