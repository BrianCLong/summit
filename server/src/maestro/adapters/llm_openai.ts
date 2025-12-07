import { CostMeter, LLMUsage } from '../cost_meter';
import { logger, getContext, metrics, tracer } from '../../observability/index.js';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

export interface LLMResult {
  content: string;
  usage: LLMUsage;
}

export class OpenAILLM {
  constructor(
    private apiKey: string,
    private costMeter: CostMeter,
  ) {}

  async callCompletion(
    runId: string,
    taskId: string,
    params: { model: string; messages: any[] },
  ): Promise<string> {
    // Strip prefix if present, e.g. "openai:gpt-4" -> "gpt-4"
    const modelName = params.model.replace(/^openai:/, '');

    return tracer.trace('llm.invoke', async (span) => {
        const start = process.hrtime();
        const ctx = getContext();

        span.setAttributes({
            'llm.provider': 'openai',
            'llm.model': modelName,
            'maestro.runId': runId,
            'maestro.taskId': taskId,
            'tenant.id': ctx?.tenantId
        });

        // Log start (redacted messages)
        logger.debug('LLM Call Start', {
            provider: 'openai',
            model: modelName,
            runId,
            taskId
        });

        try {
            // pseudo-code — plug in real OpenAI client
            const raw = await this.fakeOpenAIChatCompletion({ ...params, model: modelName });

            const usage: LLMUsage = {
                model: modelName,
                vendor: 'openai',
                inputTokens: raw.usage.prompt_tokens,
                outputTokens: raw.usage.completion_tokens,
            };

            await this.costMeter.record(runId, taskId, usage);

            const diff = process.hrtime(start);
            const duration = (diff[0] * 1e9 + diff[1]) / 1e9;

            metrics.incrementCounter('summit_llm_requests_total', {
                provider: 'openai',
                model: modelName,
                status: 'success',
                tenantId: ctx?.tenantId
            });

            metrics.observeHistogram('summit_llm_latency_seconds', duration, {
                provider: 'openai',
                model: modelName
            });

            // Record tokens
            metrics.incrementCounter('summit_llm_tokens_total', {
                provider: 'openai',
                model: modelName,
                kind: 'input'
            }, usage.inputTokens);

            metrics.incrementCounter('summit_llm_tokens_total', {
                provider: 'openai',
                model: modelName,
                kind: 'output'
            }, usage.outputTokens);

            return raw.choices[0].message.content;

        } catch (error: any) {
            const diff = process.hrtime(start);
            const duration = (diff[0] * 1e9 + diff[1]) / 1e9;

            metrics.incrementCounter('summit_llm_requests_total', {
                provider: 'openai',
                model: modelName,
                status: 'error',
                tenantId: ctx?.tenantId
            });

            logger.error('LLM Call Failed', {
                provider: 'openai',
                model: modelName,
                error: error.message
            });

            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            throw error;
        }
    }, {
        kind: SpanKind.CLIENT,
        attributes: {
            'llm.system': 'openai'
        }
    });
  }

  // Helper method to simulate OpenAI call
  private async fakeOpenAIChatCompletion(params: { model: string; messages: any[] }) {
    return {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: Date.now(),
      model: params.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a simulated response from OpenAI.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }
}
