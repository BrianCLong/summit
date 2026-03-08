"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativeSimulationManager = exports.NarrativeSimulationManager = void 0;
// @ts-nocheck
const node_crypto_1 = require("node:crypto");
const engine_js_1 = require("./engine.js");
const metrics_js_1 = require("../observability/metrics.js");
class NarrativeSimulationManager {
    static instance;
    simulations = new Map();
    static getInstance() {
        if (!NarrativeSimulationManager.instance) {
            NarrativeSimulationManager.instance = new NarrativeSimulationManager();
        }
        return NarrativeSimulationManager.instance;
    }
    createSimulation(input) {
        const id = (0, node_crypto_1.randomUUID)();
        const config = {
            id,
            name: input.name,
            themes: input.themes,
            tickIntervalMinutes: input.tickIntervalMinutes ?? 60,
            initialEntities: input.initialEntities,
            initialParameters: input.initialParameters,
            agents: input.agents,
            generatorMode: input.generatorMode,
            llmClient: input.llmClient,
            metadata: input.metadata,
        };
        const engine = new engine_js_1.NarrativeSimulationEngine(config);
        this.simulations.set(id, engine);
        metrics_js_1.metrics.narrativeSimulationActiveSimulations.inc();
        return engine.getState();
    }
    getState(id) {
        return this.simulations.get(id)?.getState();
    }
    getEngine(id) {
        return this.simulations.get(id);
    }
    list() {
        return Array.from(this.simulations.values()).map((engine) => engine.getSummary());
    }
    remove(id) {
        const deleted = this.simulations.delete(id);
        if (deleted) {
            metrics_js_1.metrics.narrativeSimulationActiveSimulations.dec();
        }
        return deleted;
    }
    queueEvent(id, event) {
        const engine = this.getEngine(id);
        if (!engine) {
            throw new Error(`Simulation ${id} not found`);
        }
        metrics_js_1.metrics.narrativeSimulationEventsTotal.inc({ simulation_id: id, event_type: event.type });
        engine.queueEvent(event);
    }
    injectActorAction(id, actorId, description, overrides) {
        const engine = this.getEngine(id);
        if (!engine) {
            throw new Error(`Simulation ${id} not found`);
        }
        engine.injectActorAction(actorId, description, overrides);
    }
    async tick(id, steps = 1) {
        const engine = this.getEngine(id);
        if (!engine) {
            throw new Error(`Simulation ${id} not found`);
        }
        const end = metrics_js_1.metrics.narrativeSimulationDurationSeconds.startTimer({ simulation_id: id });
        try {
            metrics_js_1.metrics.narrativeSimulationTicksTotal.inc({ simulation_id: id }, steps);
            return await engine.tick(steps);
        }
        finally {
            end();
        }
    }
}
exports.NarrativeSimulationManager = NarrativeSimulationManager;
exports.narrativeSimulationManager = NarrativeSimulationManager.getInstance();
