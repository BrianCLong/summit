import { IntentRouter } from './router/intent-router.js';
import { HierarchicalMemory } from './memory/hierarchical-memory.js';
import { Message, AgentResponse } from './types.js';
import { randomUUID } from 'crypto';

export class ChatOpsOrchestrator {
  private router: IntentRouter;
  private memory: HierarchicalMemory;

  constructor() {
    this.router = new IntentRouter();
    this.memory = new HierarchicalMemory();
  }

  async processMessage(userId: string, content: string): Promise<AgentResponse> {
    const messageId = randomUUID();
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date()
    };

    // 1. Add to Memory
    await this.memory.addMessage(userMessage);

    // 2. Route Intent
    const intent = await this.router.routeIntent(content);

    // 3. Build Context
    const context = await this.memory.getContext(content);

    // 4. Execute Agent (Plan -> Research -> Execute)
    // For Phase 1 Prototype, we simulate the output based on intent.

    let responseContent = '';

    if (intent.type === 'query') {
        // Use Graph Chat (NL -> Cypher simulation)
        responseContent = `I understand you are looking for ${intent.entities.join(', ')}. \nFound 3 related nodes in the graph.`;
    } else if (intent.type === 'analysis') {
        responseContent = `Running analysis on ${intent.entities.join(', ')}... \nConsensus from Claude and GPT-4 indicates high threat level.`;
    } else {
        responseContent = `Acknowledged. Processing ${intent.type} request.`;
    }

    // 5. Save Response to Memory
    const agentMessage: Message = {
        id: randomUUID(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
    };
    await this.memory.addMessage(agentMessage);

    return {
      content: responseContent,
      actionsTaken: [
          {
              type: intent.type === 'query' ? 'search_graph' : 'execute_tool',
              payload: { intent, entities: intent.entities },
              riskLevel: 'autonomous' // Default to low risk for read ops
          }
      ],
      traceId: randomUUID()
    };
  }
}
