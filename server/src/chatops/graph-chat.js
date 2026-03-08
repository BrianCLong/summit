"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphChatService = void 0;
const index_js_1 = require("../nl2cypher/index.js");
const llm_service_js_1 = require("./llm/llm-service.js");
class GraphChatService {
    llm;
    constructor() {
        this.llm = new llm_service_js_1.LLMService();
    }
    async processQuery(query) {
        let cypher = '';
        let explanation = '';
        // 1. Try Deterministic NL2Cypher
        try {
            const translation = (0, index_js_1.nl2cypher)(query);
            cypher = translation.cypher;
            explanation = 'Generated via deterministic parser.';
        }
        catch (e) {
            // 2. Fallback to LLM (Multi-Hop / Complex)
            console.info('Deterministic NL2Cypher failed, falling back to LLM', e);
            const prompt = `Translate this question to Neo4j Cypher: "${query}". Return only the Cypher query.`;
            const response = await this.llm.generateText(prompt, 'gpt-4-turbo');
            cypher = response.content;
            explanation = 'Generated via GPT-4 Graph Translator.';
        }
        // 3. Simulate Execution (mock results)
        // In real implementation, this would use neo4jDriver.session().run(cypher)
        const results = this.mockExecution(cypher);
        return {
            cypher,
            results,
            explanation
        };
    }
    mockExecution(cypher) {
        // Return structured mock data based on query type
        if (cypher.toLowerCase().includes('count')) {
            return [{ count: 42 }];
        }
        if (cypher.toLowerCase().includes('return n')) {
            return [
                { id: 'node-1', labels: ['ThreatActor'], properties: { name: 'APT29', origin: 'Russia' } },
                { id: 'node-2', labels: ['Indicator'], properties: { ip: '192.168.1.1' } }
            ];
        }
        return [{ message: 'Query executed successfully', nodes_affected: 0 }];
    }
}
exports.GraphChatService = GraphChatService;
