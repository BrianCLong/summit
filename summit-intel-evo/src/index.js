"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEvolution = runEvolution;
const EvolutionEngine_js_1 = require("./core/EvolutionEngine.js");
const FeedbackCollector_js_1 = require("./core/FeedbackCollector.js");
const CurriculumAgent_js_1 = require("./agents/CurriculumAgent.js");
const ExecutorAgent_js_1 = require("./agents/ExecutorAgent.js");
const fs = __importStar(require("fs"));
/**
 * Main Runner for SummitIntelEvo
 */
async function runEvolution(rounds = 300) {
    console.log(`🚀 Starting SummitIntelEvo Simulation (${rounds} rounds)`);
    const feedback = new FeedbackCollector_js_1.FeedbackCollector();
    const engine = new EvolutionEngine_js_1.EvolutionEngine(feedback);
    const curriculum = new CurriculumAgent_js_1.CurriculumAgent();
    const swarm = [new ExecutorAgent_js_1.ExecutorAgent('Agent-Alpha'), new ExecutorAgent_js_1.ExecutorAgent('Agent-Beta')];
    const logHeader = 'Round,LRA,CE,KRI\n';
    fs.writeFileSync('intel-evo-metrics.csv', logHeader);
    for (let r = 1; r <= rounds; r++) {
        // 1. Curriculum
        const tasks = curriculum.generateTasks(swarm.length);
        // 2. Execution (Entangled)
        for (let i = 0; i < swarm.length; i++) {
            await swarm[i].execute(tasks[i]);
        }
        // 3. Evolve Loop
        await engine.evolve(r);
        // 4. Log
        const m = engine.getMetrics();
        const logLine = `${r},${m['LRA'].toFixed(4)},${m['CE'].toFixed(4)},${m['KRI'].toFixed(4)}\n`;
        fs.appendFileSync('intel-evo-metrics.csv', logLine);
    }
    console.log('\n--- Simulation Complete ---');
    console.log('Final Metrics (PhD-Level Validation):');
    console.log(JSON.stringify(engine.getMetrics(), null, 2));
    console.log('Artifact generated: intel-evo-metrics.csv');
}
