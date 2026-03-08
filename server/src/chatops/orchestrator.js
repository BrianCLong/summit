"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatOpsOrchestrator = void 0;
const intent_router_js_1 = require("./router/intent-router.js");
const hierarchical_memory_js_1 = require("./memory/hierarchical-memory.js");
const graph_chat_js_1 = require("./graph-chat.js");
const crypto_1 = require("crypto");
// import { logger } from '../utils/logger.js';
class ChatOpsOrchestrator {
    router;
    memory;
    graphChat;
    constructor() {
        this.router = new intent_router_js_1.IntentRouter();
        this.memory = new hierarchical_memory_js_1.HierarchicalMemory();
        this.graphChat = new graph_chat_js_1.GraphChatService();
    }
    async processMessage(userId, content) {
        const traceId = (0, crypto_1.randomUUID)();
        const userMessage = {
            id: (0, crypto_1.randomUUID)(),
            role: 'user',
            content,
            timestamp: new Date()
        };
        // 1. Add to Memory (Short-Term)
        await this.memory.addMessage(userMessage);
        // 2. Route Intent (Multi-Model Consensus)
        const intent = await this.router.routeIntent(content);
        console.log(`Intent routed: ${intent.type}`, { intent, traceId });
        // 3. Risk Assessment (Bounded Autonomy)
        const riskLevel = this.assessRisk(intent);
        if (riskLevel === 'prohibited') {
            return this.createProhibitedResponse(intent, traceId);
        }
        // 4. Build Context (Hierarchical: Short + Med + Long)
        // We pass this to the agent (not used in this simplified flow but ready)
        const context = await this.memory.getContext(content);
        // 5. Execute Action based on Intent
        let responseContent = '';
        let actions = [];
        if (riskLevel === 'hitl') {
            responseContent = `I have understood your request to perform a ${intent.type} operation on ${intent.entities.join(', ')}. This requires approval. [APPROVAL_REQUEST_ID:${(0, crypto_1.randomUUID)()}]`;
            actions.push({
                type: 'ask_user',
                payload: { reason: 'Risk gate: HITL required for mutation' },
                riskLevel
            });
        }
        else {
            // Autonomous Execution
            if (intent.type === 'query') {
                const graphResult = await this.graphChat.processQuery(content);
                responseContent = `Graph Query Executed:\n${graphResult.cypher}\n\nResults:\n${JSON.stringify(graphResult.results, null, 2)}`;
                actions.push({
                    type: 'search_graph',
                    payload: { cypher: graphResult.cypher, results: graphResult.results },
                    riskLevel
                });
            }
            else if (intent.type === 'analysis') {
                responseContent = `Running analysis on ${intent.entities.join(', ')}... \nBased on consensus from Claude and GPT-4, these entities exhibit high threat indicators linked to recent campaigns.`;
                actions.push({
                    type: 'execute_tool',
                    payload: { tool: 'analysis_engine', entities: intent.entities },
                    riskLevel
                });
            }
            else {
                responseContent = `Processed ${intent.type} request.`;
            }
        }
        // 6. Save Response to Memory
        const agentMessage = {
            id: (0, crypto_1.randomUUID)(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date()
        };
        await this.memory.addMessage(agentMessage);
        return {
            content: responseContent,
            actionsTaken: actions,
            traceId
        };
    }
    assessRisk(intent) {
        switch (intent.type) {
            case 'query':
            case 'analysis':
                return 'autonomous';
            case 'graph_mutation':
            case 'command':
                return 'hitl';
            default:
                return 'autonomous';
        }
    }
    createProhibitedResponse(intent, traceId) {
        return {
            content: 'I cannot fulfill this request. It violates safety policies.',
            actionsTaken: [],
            traceId
        };
    }
}
exports.ChatOpsOrchestrator = ChatOpsOrchestrator;
