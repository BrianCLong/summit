
import { LlmOrchestrator, ChatCompletionRequest, ChatCompletionResult, ChatMessage, ToolCallInvocation } from '../types';
import { ToolRegistry } from '../tools/registry';

export interface AgentPlanStep {
  type: "llm_call" | "tool_call" | "decision";
  description: string;
  toolCall?: ToolCallInvocation;
  toolResult?: any;
}

export interface AgentResult {
  finalAnswer: string;
  steps: AgentPlanStep[];
}

export class AgentRunner {
  constructor(
      private orchestrator: LlmOrchestrator,
      private tools: ToolRegistry
  ) {}

  async run(
      tenantId: string,
      task: string,
      maxSteps: number = 5
  ): Promise<AgentResult> {
    const steps: AgentPlanStep[] = [];
    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: 'You are a helpful agent. You can use tools to answer the user request.'
        },
        { role: 'user', content: task }
    ];

    let finalAnswer = '';
    const availableTools = this.tools.getDefinitions();

    for (let i = 0; i < maxSteps; i++) {
        // 1. LLM Call
        const response = await this.orchestrator.chat({
            tenantId,
            purpose: 'agent',
            riskLevel: 'medium',
            messages,
            tools: availableTools
        });

        // 2. Process Result
        if (response.content) {
            messages.push({ role: 'assistant', content: response.content });
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
            // It wants to call tools
            // We must add the assistant message WITH toolCalls to history so the provider can format it correctly
            // If response.content was null, we still need an assistant message
            if (!response.content) {
                 messages.push({
                     role: 'assistant',
                     content: null,
                     toolCalls: response.toolCalls
                 });
            } else {
                // If we already pushed content, update that message (last one) to include toolCalls
                const lastMsg = messages[messages.length - 1];
                if (lastMsg.role === 'assistant') {
                    lastMsg.toolCalls = response.toolCalls;
                }
            }

            for (const call of response.toolCalls) {
                steps.push({
                    type: 'tool_call',
                    description: `Calling ${call.toolName}`,
                    toolCall: call
                });

                try {
                    const result = await this.tools.execute(call.toolName, call.args, { tenantId });

                    steps.push({
                         type: 'decision',
                         description: `Tool ${call.toolName} returned result`,
                         toolResult: result
                    });

                    // Add Tool Result Message
                    messages.push({
                        role: 'tool',
                        content: JSON.stringify(result),
                        toolCallId: call.id
                    });
                } catch (e: any) {
                    messages.push({
                        role: 'tool',
                        content: `Error: ${e.message}`,
                        toolCallId: call.id
                    });
                }
            }
        } else {
            // No tool calls, we are done
            finalAnswer = response.content || '';
            break;
        }
    }

    return { finalAnswer, steps };
  }
}
