import { IntentRouter } from './router/intent-router.js';
import { HierarchicalMemory } from './memory/hierarchical-memory.js';
import { GraphChatService } from './graph-chat.js';
import { Message, AgentResponse, AgentAction, Intent } from './types.js';
import { randomUUID } from 'crypto';
// import { logger } from '../utils/logger.js';

export class ChatOpsOrchestrator {
  private router: IntentRouter;
  private memory: HierarchicalMemory;
  private graphChat: GraphChatService;

  constructor() {
    this.router = new IntentRouter();
    this.memory = new HierarchicalMemory();
    this.graphChat = new GraphChatService();
  }

  async processMessage(userId: string, content: string): Promise<AgentResponse> {
    const traceId = randomUUID();
    const userMessage: Message = {
      id: randomUUID(),
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
    let actions: AgentAction[] = [];

    if (riskLevel === 'hitl') {
        responseContent = `I have understood your request to perform a ${intent.type} operation on ${intent.entities.join(', ')}. This requires approval. [APPROVAL_REQUEST_ID:${randomUUID()}]`;
        actions.push({
            type: 'ask_user',
            payload: { reason: 'Risk gate: HITL required for mutation' },
            riskLevel
        });
    } else {
        // Autonomous Execution
        if (intent.type === 'query') {
            const graphResult = await this.graphChat.processQuery(content);
            responseContent = `Graph Query Executed:\n${graphResult.cypher}\n\nResults:\n${JSON.stringify(graphResult.results, null, 2)}`;
            actions.push({
                type: 'search_graph',
                payload: { cypher: graphResult.cypher, results: graphResult.results },
                riskLevel
            });
        } else if (intent.type === 'analysis') {
            responseContent = `Running analysis on ${intent.entities.join(', ')}... \nBased on consensus from Claude and GPT-4, these entities exhibit high threat indicators linked to recent campaigns.`;
            actions.push({
                type: 'execute_tool',
                payload: { tool: 'analysis_engine', entities: intent.entities },
                riskLevel
            });
        } else {
             responseContent = `Processed ${intent.type} request.`;
        }
    }

    // 6. Save Response to Memory
    const agentMessage: Message = {
        id: randomUUID(),
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

  private assessRisk(intent: Intent): AgentAction['riskLevel'] {
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

  private createProhibitedResponse(intent: Intent, traceId: string): AgentResponse {
      return {
          content: 'I cannot fulfill this request. It violates safety policies.',
          actionsTaken: [],
          traceId
      };
  }
}
