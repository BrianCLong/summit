
import { LlmOrchestrator, ChatCompletionRequest, ChatCompletionResult, ChatMessage, ToolCallInvocation } from '../types.js';
import { ToolRegistry } from '../tools/registry.js';
import { logger, correlationStorage } from '../../config/logger.js';
import { metrics } from '../../monitoring/metrics.js';

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
    const startTime = Date.now();
    const correlationId = correlationStorage.getStore()?.get('correlationId') || 'unknown';

    logger.info({
        event: 'AgentExecutionStarted',
        tenantId,
        task: task.substring(0, 50),
        correlationId
    }, 'Agent execution started');

    // Increment total executions
    metrics.agentExecutionsTotal?.inc({ tenant: tenantId, status: 'started' });

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

    try {
      for (let i = 0; i < maxSteps; i++) {
        // 1. LLM Call
        const stepStartTime = Date.now();
        const response = await this.orchestrator.chat({
            tenantId,
            purpose: 'agent',
            riskLevel: 'medium',
            messages,
            tools: availableTools
        });

        // Log LLM step
        logger.info({
            event: 'AgentStep',
            stepType: 'llm',
            durationMs: Date.now() - stepStartTime,
            correlationId
        }, 'Agent LLM step completed');

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

    const duration = (Date.now() - startTime) / 1000;
    logger.info({
        event: 'AgentExecutionCompleted',
        outcome: 'success',
        durationMs: Date.now() - startTime,
        stepsCount: steps.length,
        correlationId
    }, 'Agent execution completed successfully');

    metrics.agentExecutionsTotal?.inc({ tenant: tenantId, status: 'success' });
    metrics.agentExecutionDuration?.observe({ tenant: tenantId, status: 'success' }, duration);

    return { finalAnswer, steps };
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error({
            event: 'AgentExecutionFailed',
            error: (error as Error).message,
            durationMs: Date.now() - startTime,
            correlationId
        }, 'Agent execution failed');

        metrics.agentExecutionsTotal?.inc({ tenant: tenantId, status: 'failure' });
        metrics.agentExecutionDuration?.observe({ tenant: tenantId, status: 'failure' }, duration);
        throw error;
    }
  }
}
