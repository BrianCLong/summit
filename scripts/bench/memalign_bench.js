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
const episodic_store_1 = require("../../src/evals/memalign/episodic_store");
const semantic_store_1 = require("../../src/evals/memalign/semantic_store");
const retrieve_1 = require("../../src/evals/memalign/retrieve");
const path = __importStar(require("path"));
const url_1 = require("url");
const fs = __importStar(require("fs"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
async function runBench() {
    console.log('Running MemAlign Benchmark...');
    const benchDir = path.join(__dirname, 'bench_data');
    if (!fs.existsSync(benchDir))
        fs.mkdirSync(benchDir);
    const semStore = new semantic_store_1.SemanticStore(path.join(benchDir, 'sem.json'));
    const epiStore = new episodic_store_1.EpisodicStore(path.join(benchDir, 'epi.json'));
    // Seed data
    for (let i = 0; i < 1000; i++) {
        await semStore.add({
            id: `r${i}`,
            content: `Rule number ${i} about general principles of AI safety and politeness`,
            rule_type: 'guideline',
            metadata: { tags: ['safety', 'politeness'] }
        });
        if (i % 10 === 0) {
            await epiStore.add({
                id: `e${i}`,
                content: `Example content ${i}`,
                input: `Input query ${i}`,
                output: `Output ${i}`,
                label: 1,
                rationale: `Rationale ${i}`,
                metadata: {}
            });
        }
    }
    // Bench Retrieval
    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
        await (0, retrieve_1.retrieveContext)('safety', semStore, epiStore);
    }
    const end = performance.now();
    const avgLatency = (end - start) / iterations;
    console.log(`Avg Retrieval Latency: ${avgLatency.toFixed(2)}ms`);
    // Cleanup
    fs.rmSync(benchDir, { recursive: true, force: true });
    if (avgLatency > 200) {
        console.error('Latency exceeded budget of 200ms');
        process.exit(1);
    }
}
runBench();
