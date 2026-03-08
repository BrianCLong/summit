"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationEngine = void 0;
const Actor_js_1 = require("../entities/Actor.js");
const NarrativeState_js_1 = require("./NarrativeState.js");
const EventProcessor_js_1 = require("./EventProcessor.js");
const telemetry_js_1 = require("../telemetry.js");
class SimulationEngine {
    telemetry;
    constructor(telemetry = telemetry_js_1.simulationTelemetry) {
        this.telemetry = telemetry;
    }
    state = null;
    processor = null;
    initialized = false;
    eventQueue = [];
    initialize(config) {
        this.state = new NarrativeState_js_1.NarrativeState(config.initialTimestamp ?? 0);
        for (const actorConfig of config.actors) {
            const actor = new Actor_js_1.Actor({
                id: actorConfig.id,
                name: actorConfig.name,
                traits: actorConfig.traits,
                mood: actorConfig.mood,
                resilience: actorConfig.resilience,
                influence: actorConfig.influence,
            });
            this.state.addActor(actor);
        }
        if (config.relationships) {
            for (const relationship of config.relationships) {
                this.state.registerRelationship(relationship);
            }
        }
        this.processor = new EventProcessor_js_1.EventProcessor(this.state);
        this.eventQueue = [];
        this.telemetry.recordInitialization({
            actorCount: config.actors.length,
            relationshipCount: config.relationships?.length ?? 0,
            seedEvents: config.seedEvents?.length ?? 0,
        });
        if (config.seedEvents) {
            for (const event of config.seedEvents) {
                this.eventQueue.push({ ...event });
            }
        }
        this.initialized = true;
    }
    step() {
        const currentState = this.ensureState();
        const processor = this.ensureProcessor();
        const stopTimer = this.telemetry.timer();
        currentState.advanceTime();
        const eventsToProcess = [...this.eventQueue];
        this.eventQueue = [];
        for (const event of eventsToProcess) {
            const processedEvent = {
                ...event,
                timestamp: currentState.timestamp,
            };
            const update = processor.processEvent(processedEvent);
            this.applyStateUpdate(processedEvent, update);
        }
        this.telemetry.recordStep({
            processedEvents: eventsToProcess.length,
            queuedEvents: this.eventQueue.length,
            durationMs: stopTimer(),
        });
    }
    injectEvent(event) {
        this.ensureState();
        const timestamp = typeof event.timestamp === 'number'
            ? event.timestamp
            : (this.state?.timestamp ?? 0);
        this.eventQueue.push({ ...event, timestamp });
        this.telemetry.recordInjection({
            queuedEvents: this.eventQueue.length,
            eventType: event.type,
        });
    }
    getState() {
        return this.ensureState();
    }
    applyStateUpdate(event, update) {
        const state = this.ensureState();
        state.recordEvent(event);
        for (const message of update.narrativeLog) {
            state.log(message);
        }
        for (const triggered of update.triggeredEvents) {
            this.eventQueue.push({ ...triggered });
        }
    }
    ensureState() {
        if (!this.initialized || !this.state) {
            throw new Error('Simulation engine has not been initialized');
        }
        return this.state;
    }
    ensureProcessor() {
        if (!this.processor) {
            throw new Error('Simulation engine missing event processor');
        }
        return this.processor;
    }
}
exports.SimulationEngine = SimulationEngine;
