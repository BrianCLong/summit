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
const ingest_1 = require("../../src/evals/memalign/ingest");
const distill_1 = require("../../src/evals/memalign/distill");
const semantic_store_1 = require("../../src/evals/memalign/semantic_store");
const episodic_store_1 = require("../../src/evals/memalign/episodic_store");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
async function testIngestAndDistill() {
    const epiPath = path.join(__dirname, 'test_ingest_episodic.json');
    const semPath = path.join(__dirname, 'test_ingest_semantic.json');
    if (fs.existsSync(epiPath))
        fs.unlinkSync(epiPath);
    if (fs.existsSync(semPath))
        fs.unlinkSync(semPath);
    const epiStore = new episodic_store_1.EpisodicStore(epiPath);
    const semStore = new semantic_store_1.SemanticStore(semPath);
    const fixturePath = path.join(__dirname, '../../fixtures/memalign/feedback/sample.jsonl');
    // Test Ingest
    const ingestedCount = await (0, ingest_1.ingestFeedback)(fixturePath, epiStore, 'politeness');
    if (ingestedCount !== 2) {
        throw new Error(`Expected 2 ingested items, got ${ingestedCount}`);
    }
    const episodes = await epiStore.list();
    if (episodes.length !== 2) {
        throw new Error(`Expected 2 episodes in store, got ${episodes.length}`);
    }
    // Test Distill
    const distilledCount = await (0, distill_1.distillMemories)(epiStore, semStore, 'politeness');
    if (distilledCount !== 2) { // 2 unique rationales
        throw new Error(`Expected 2 distilled rules, got ${distilledCount}`);
    }
    const rules = await semStore.list();
    const ruleContent = rules.map(r => r.content);
    if (!ruleContent.some(c => c.includes('Avoid demanding language'))) {
        throw new Error('Failed to distill demanding language rule');
    }
    // Cleanup
    if (fs.existsSync(epiPath))
        fs.unlinkSync(epiPath);
    if (fs.existsSync(semPath))
        fs.unlinkSync(semPath);
    console.log('Ingest and Distill test passed');
}
testIngestAndDistill().catch(e => {
    console.error(e);
    process.exit(1);
});
