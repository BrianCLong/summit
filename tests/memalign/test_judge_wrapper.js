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
const memalign_wrapper_1 = require("../../src/evals/judges/memalign_wrapper");
const base_judge_1 = require("../../src/evals/judges/base_judge");
const semantic_store_1 = require("../../src/evals/memalign/semantic_store");
const episodic_store_1 = require("../../src/evals/memalign/episodic_store");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
async function testJudgeWrapper() {
    const semPath = path.join(__dirname, 'test_wrapper_sem.json');
    const epiPath = path.join(__dirname, 'test_wrapper_epi.json');
    if (fs.existsSync(semPath))
        fs.unlinkSync(semPath);
    if (fs.existsSync(epiPath))
        fs.unlinkSync(epiPath);
    const semStore = new semantic_store_1.SemanticStore(semPath);
    const epiStore = new episodic_store_1.EpisodicStore(epiPath);
    // Add a rule that matches "poem"
    await semStore.add({
        id: 'r1',
        content: 'When writing a poem, be concise',
        rule_type: 'guideline',
        metadata: {}
    });
    const baseJudge = new base_judge_1.MockJudge('mock-1');
    const wrapper = new memalign_wrapper_1.MemAlignJudgeWrapper(baseJudge, semStore, epiStore);
    const result = await wrapper.evaluate('Write a poem');
    if (!result.context || !result.context.some(s => s.includes('When writing a poem'))) {
        console.log('Result context:', result.context);
        throw new Error('Judge wrapper failed to inject semantic memory');
    }
    if (result.metadata?.memalign_retrieval_count !== 1) {
        throw new Error('Incorrect retrieval count in metadata');
    }
    // Cleanup
    if (fs.existsSync(semPath))
        fs.unlinkSync(semPath);
    if (fs.existsSync(epiPath))
        fs.unlinkSync(epiPath);
    console.log('JudgeWrapper test passed');
}
testJudgeWrapper().catch(e => {
    console.error(e);
    process.exit(1);
});
