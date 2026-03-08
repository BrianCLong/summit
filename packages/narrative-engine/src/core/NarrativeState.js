"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativeState = void 0;
const Relationship_js_1 = require("../entities/Relationship.js");
class NarrativeState {
    actors = new Map();
    events = [];
    timestamp;
    logs = [];
    constructor(initialTimestamp = 0) {
        this.timestamp = initialTimestamp;
    }
    addActor(actor) {
        this.actors.set(actor.id, actor);
    }
    getActor(id) {
        return this.actors.get(id);
    }
    ensureActor(id) {
        const actor = this.actors.get(id);
        if (!actor) {
            throw new Error(`Actor ${id} not found in narrative state`);
        }
        return actor;
    }
    registerRelationship(config) {
        const source = this.ensureActor(config.sourceId);
        const target = this.ensureActor(config.targetId);
        const relationship = new Relationship_js_1.Relationship({
            sourceId: config.sourceId,
            targetId: config.targetId,
            type: config.type,
            intensity: config.intensity,
            trust: config.trust,
        });
        source.addRelationship(relationship);
        const reciprocal = new Relationship_js_1.Relationship({
            sourceId: config.targetId,
            targetId: config.sourceId,
            type: config.type === 'ally'
                ? 'ally'
                : config.type === 'rival'
                    ? 'rival'
                    : config.type === 'family'
                        ? 'family'
                        : 'neutral',
            intensity: config.intensity,
            trust: config.trust,
        });
        target.addRelationship(reciprocal);
    }
    recordEvent(event) {
        this.events.push(event);
    }
    advanceTime(step = 1) {
        this.timestamp += step;
        return this.timestamp;
    }
    log(message) {
        this.logs.push(message);
    }
    consumeLogs() {
        const copy = [...this.logs];
        this.logs = [];
        return copy;
    }
    toJSON() {
        return {
            timestamp: this.timestamp,
            events: this.events.map((event) => ({ ...event })),
            actors: Array.from(this.actors.values()).map((actor) => actor.snapshot()),
            logs: this.logs.slice(),
        };
    }
}
exports.NarrativeState = NarrativeState;
