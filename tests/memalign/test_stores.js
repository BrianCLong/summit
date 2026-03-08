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
const semantic_store_1 = require("../../src/evals/memalign/semantic_store");
const episodic_store_1 = require("../../src/evals/memalign/episodic_store");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
async function testSemanticStore() {
    const testPath = path.join(__dirname, 'test_semantic.json');
    if (fs.existsSync(testPath))
        fs.unlinkSync(testPath);
    const store = new semantic_store_1.SemanticStore(testPath);
    const rule = {
        id: 'test-rule-1',
        content: 'Be polite',
        rule_type: 'guideline',
        metadata: { tags: ['politeness'] }
    };
    await store.add(rule);
    const retrieved = await store.retrieve({ query: 'polite' });
    if (retrieved.length !== 1 || retrieved[0].id !== 'test-rule-1') {
        throw new Error('Semantic retrieve failed');
    }
    await store.delete('test-rule-1');
    const empty = await store.retrieve({ query: 'polite' });
    if (empty.length !== 0) {
        throw new Error('Semantic delete failed');
    }
    if (fs.existsSync(testPath))
        fs.unlinkSync(testPath);
    console.log('SemanticStore test passed');
}
async function testEpisodicStore() {
    const testPath = path.join(__dirname, 'test_episodic.json');
    if (fs.existsSync(testPath))
        fs.unlinkSync(testPath);
    const store = new episodic_store_1.EpisodicStore(testPath);
    const example = {
        id: 'ex-1',
        content: 'Example interaction',
        input: 'Hello',
        output: 'Hi there',
        label: 'positive',
        rationale: 'Friendly greeting',
        metadata: {}
    };
    await store.add(example);
    const retrieved = await store.retrieve({ query: 'Hello' });
    if (retrieved.length !== 1 || retrieved[0].id !== 'ex-1') {
        throw new Error('Episodic retrieve failed');
    }
    if (fs.existsSync(testPath))
        fs.unlinkSync(testPath);
    console.log('EpisodicStore test passed');
}
async function run() {
    try {
        await testSemanticStore();
        await testEpisodicStore();
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
