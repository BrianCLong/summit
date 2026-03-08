"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agenticRag_1 = require("../../src/intelgraph/agenticRag");
class FakeVectorDB {
    lastSearchEmbed;
    stored = [];
    async search(embedding) {
        this.lastSearchEmbed = embedding;
        return (this.stored[0] ?? {
            answers: [],
            supportingPassages: [],
            confidence: 0,
        });
    }
    async insert(_embedding, result) {
        this.stored.push(result);
    }
}
class FakeGraphDB {
    async getRelationships(intent) {
        const edges = [
            {
                source: 'entity',
                target: 'entity-related',
                type: 'related',
                relevance: 0.8,
            },
        ];
        return edges.slice(0, intent.limit);
    }
    async insertRelationships() {
        return undefined;
    }
}
class FakeEmbedder {
    async embed(text) {
        return [text.length];
    }
}
class FakeLLMReasoner {
    async planResearch(gaps) {
        return gaps.map((gap) => `sub-question: ${gap.question}`);
    }
    async synthesizeAnswer() {
        return 'final answer';
    }
    async estimateConfidence() {
        return 0.8;
    }
}
describe('AgenticRAG', () => {
    it('falls back to research when memory confidence is low', async () => {
        const vector = new FakeVectorDB();
        const graph = new FakeGraphDB();
        const embedder = new FakeEmbedder();
        const llm = new FakeLLMReasoner();
        vector.stored = [
            {
                answers: [],
                supportingPassages: [],
                confidence: 0.1,
            },
        ];
        const intentCompiler = new agenticRag_1.DefaultIntentCompiler();
        const memorizer = new agenticRag_1.MemorizerAgent(vector, graph, embedder, intentCompiler, agenticRag_1.DEFAULT_EVIDENCE_BUDGET);
        const researcher = new agenticRag_1.ResearcherAgent(embedder, llm);
        const expander = new agenticRag_1.GraphExpander(graph, intentCompiler, agenticRag_1.DEFAULT_EVIDENCE_BUDGET);
        const rag = new agenticRag_1.AgenticRAG(memorizer, researcher, expander);
        const query = { text: 'What is Summit?', entities: ['Summit'] };
        const result = await rag.retrieve(query);
        expect(result.supportingPassages.length).toBeGreaterThan(0);
        expect(result.graph).toBeDefined();
    });
    it('supports multi-step reasoning', async () => {
        const vector = new FakeVectorDB();
        const graph = new FakeGraphDB();
        const embedder = new FakeEmbedder();
        const llm = new FakeLLMReasoner();
        vector.stored = [
            {
                answers: ['cached answer'],
                supportingPassages: ['cached'],
                confidence: 0.95,
            },
        ];
        const intentCompiler = new agenticRag_1.DefaultIntentCompiler();
        const memorizer = new agenticRag_1.MemorizerAgent(vector, graph, embedder, intentCompiler, agenticRag_1.DEFAULT_EVIDENCE_BUDGET);
        const researcher = new agenticRag_1.ResearcherAgent(embedder, llm);
        const expander = new agenticRag_1.GraphExpander(graph, intentCompiler, agenticRag_1.DEFAULT_EVIDENCE_BUDGET);
        const rag = new agenticRag_1.AgenticRAG(memorizer, researcher, expander);
        const query = { text: 'Explain Summit', entities: ['Summit'] };
        const result = await rag.multiStepReasoning(query);
        expect(result.answer).toBe('final answer');
        expect(result.steps.length).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
    });
});
