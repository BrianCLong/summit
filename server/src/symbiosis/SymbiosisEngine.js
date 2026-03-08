"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbiosisEngine = void 0;
const TrajectoryPredictor_js_1 = require("./layers/TrajectoryPredictor.js");
const ProbabilisticFusionCore_js_1 = require("./layers/ProbabilisticFusionCore.js");
const EvolutionaryMemoryFabric_js_1 = require("./layers/EvolutionaryMemoryFabric.js");
const InjectionOrchestrator_js_1 = require("./layers/InjectionOrchestrator.js");
const MetaSymbiote_js_1 = require("./layers/MetaSymbiote.js");
class SymbiosisEngine {
    predictor;
    fusionCore;
    memoryFabric;
    orchestrator;
    metaSymbiote;
    constructor() {
        this.predictor = new TrajectoryPredictor_js_1.TrajectoryPredictor();
        this.fusionCore = new ProbabilisticFusionCore_js_1.ProbabilisticFusionCore();
        this.memoryFabric = new EvolutionaryMemoryFabric_js_1.EvolutionaryMemoryFabric();
        this.orchestrator = new InjectionOrchestrator_js_1.InjectionOrchestrator();
        this.metaSymbiote = new MetaSymbiote_js_1.MetaSymbiote();
    }
    /**
     * Main entry point: Per-trigger orchestration
     */
    async processTrigger(trigger, agentInputs = []) {
        // 1. Predict & Prefetch
        this.predictor.recordStep(trigger);
        const foresight = this.predictor.predict(trigger);
        // 2. Fuse On-Demand
        const { fused, diffs } = this.fusionCore.fuse(agentInputs);
        // Store beliefs in memory
        for (const [k, v] of Object.entries(fused)) {
            this.memoryFabric.store(k, v);
        }
        // 3. Evolve Inline (Simulation)
        const memoryUpdate = this.memoryFabric.evolve();
        const metaProposal = this.metaSymbiote.monitor();
        const proposals = [];
        if (metaProposal)
            proposals.push(metaProposal);
        if (memoryUpdate) {
            proposals.push({
                layer: 'memory',
                change: memoryUpdate,
                expectedGain: 'Unknown',
                status: 'committed'
            });
        }
        // 4. Inject
        const injection = this.orchestrator.prepareContext(foresight, fused, proposals);
        // 5. Construct Response (Simulated answer)
        const enrichedAnswer = {
            context: injection,
            result: `Processed trigger '${trigger}' with ${foresight.length} predictions.`
        };
        return this.formatResponse(injection, enrichedAnswer);
    }
    formatResponse(injection, answer) {
        const bestForesight = injection.foresight.length > 0
            ? `${injection.foresight.length}/10 probable contexts loaded`
            : "No strong predictions";
        const fusionSummary = Object.keys(injection.beliefs).length > 0
            ? `${Object.keys(injection.beliefs).length} beliefs merged`
            : "No external beliefs";
        const evolutionProp = injection.proposals.length > 0
            ? `${injection.proposals[0].change} (${injection.proposals[0].expectedGain})`
            : "Stability maintained";
        const nextProbes = injection.probes.length > 0
            ? injection.probes.slice(0, 3).join(", ")
            : "Await signal";
        return {
            enrichedAnswer: answer,
            foresightHit: bestForesight,
            fusionSummary: fusionSummary,
            evolutionProposal: evolutionProp,
            nextProbes: nextProbes
        };
    }
    getKPIs() {
        return this.metaSymbiote.getKPIs();
    }
}
exports.SymbiosisEngine = SymbiosisEngine;
