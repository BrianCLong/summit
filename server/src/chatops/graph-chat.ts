import { nl2cypher } from '../nl2cypher/index.js';
import { LLMService } from './llm/llm-service.js';
// import { logger } from '../utils/logger.js';

export interface GraphChatResult {
    cypher: string;
    results: any[];
    explanation: string;
}

export class GraphChatService {
    private llm: LLMService;

    constructor() {
        this.llm = new LLMService();
    }

    async processQuery(query: string): Promise<GraphChatResult> {
        let cypher = '';
        let explanation = '';

        // 1. Try Deterministic NL2Cypher
        try {
            const translation = nl2cypher(query);
            cypher = translation.cypher;
            explanation = 'Generated via deterministic parser.';
        } catch (e) {
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

    private mockExecution(cypher: string): any[] {
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
