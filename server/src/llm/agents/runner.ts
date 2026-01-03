
import {
  LlmOrchestrator,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatMessage,
  ToolCallInvocation,
} from '../types.js';
import { ToolRegistry } from '../tools/registry.js';
import { logger, correlationStorage } from '../../config/logger.js';
import { metrics } from '../../lib/observability/metrics.js';
import { IntrinsicMemoryEngine } from './intrinsicMemoryEngine.js';

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
  private memoryEngine?: IntrinsicMemoryEngine;

  constructor(
    private orchestrator: LlmOrchestrator,
    private tools: ToolRegistry,
  ) {}

  async run(
    tenantId: string,
    task: string,
    maxSteps: number = 5,
    agentId = 'default-agent',
    agentRole = 'generalist',
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const correlationId = correlationStorage.getStore()?.get('correlationId') || 'unknown';

    const intrinsicMemoryEnabled = process.env.INTRINSIC_MEMORY_ENABLED === '1';
    const tokenBudget = Number(process.env.INTRINSIC_MEMORY_TOKEN_BUDGET ?? '3200');
    const dynamicTemplate = process.env.INTRINSIC_MEMORY_TEMPLATE === 'dynamic';
    if (intrinsicMemoryEnabled && !this.memoryEngine) {
      this.memoryEngine = new IntrinsicMemoryEngine();
    }

    logger.info({
        event: 'AgentExecutionStarted',
        tenantId,
        task: task.substring(0, 50),
        correlationId
    }, 'Agent execution started');

    // Increment total executions
    // Note: We need to define this metric in observability/metrics.ts first or cast to any if we are lazy,
    // but the plan is to add it properly. Assuming it exists now.
    (metrics as any).agentExecutionsTotal?.inc({ tenant: tenantId, status: 'started' });

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
      let shouldStop = false;
      for (let i = 0; i < maxSteps; i++) {
        // 1. LLM Call
        const stepStartTime = Date.now();
        const conversationHistory = intrinsicMemoryEnabled && this.memoryEngine
          ? ([{ role: 'user', content: task }, ...messages] as ChatMessage[])
          : messages;
        const contextualMessages =
          intrinsicMemoryEnabled && this.memoryEngine
            ? this.memoryEngine.constructContext({
                task,
                agentId,
                conversationHistory,
                agentMemory: this.memoryEngine.getMemory(agentId),
                tokenBudget,
              })
            : messages;

        const response = await this.orchestrator.chat({
            tenantId,
            purpose: 'agent',
            riskLevel: 'medium',
            messages: contextualMessages,
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
            shouldStop = true;
        }

        if (intrinsicMemoryEnabled && this.memoryEngine) {
          const agentOutput = response.content ?? (response.toolCalls ? JSON.stringify(response.toolCalls) : '');
          await this.memoryEngine.updateAgentMemory({
            agentId,
            agentRole,
            tenantId,
            orchestrator: this.orchestrator,
            previousMemory: this.memoryEngine.getMemory(agentId),
            agentOutput,
            enableDynamicTemplate: dynamicTemplate,
            task,
          });
        }

        if (shouldStop) {
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

    (metrics as any).agentExecutionsTotal?.inc({ tenant: tenantId, status: 'success' });
    (metrics as any).agentExecutionDuration?.observe({ tenant: tenantId, status: 'success' }, duration);

    return { finalAnswer, steps };
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error({
            event: 'AgentExecutionFailed',
            error: (error as Error).message,
            durationMs: Date.now() - startTime,
            correlationId
        }, 'Agent execution failed');

        (metrics as any).agentExecutionsTotal?.inc({ tenant: tenantId, status: 'failure' });
        (metrics as any).agentExecutionDuration?.observe({ tenant: tenantId, status: 'failure' }, duration);
        throw error;
    }
  }
}
