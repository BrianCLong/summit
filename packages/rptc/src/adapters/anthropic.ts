import type { CompiledPrompt } from '../compiler.js';
import type { SlotSchemaMap } from '../schema.js';
import type { LLMAdapter } from './types.js';

export interface AnthropicAdapterOptions {
  readonly model?: string;
  readonly systemPrompt?: string;
}

export class AnthropicAdapter implements LLMAdapter {
  public readonly name = 'anthropic:messages';
  private readonly defaultModel: string;
  private readonly defaultSystemPrompt?: string;

  constructor(options: AnthropicAdapterOptions = {}) {
    this.defaultModel = options.model ?? 'claude-3-5-sonnet-20241022';
    this.defaultSystemPrompt = options.systemPrompt;
  }

  format<TSlots extends SlotSchemaMap>(compiled: CompiledPrompt<TSlots>, options: Record<string, unknown> = {}) {
    const system = (options.systemPrompt as string | undefined) ?? this.defaultSystemPrompt ?? compiled.description;
    const model = (options.model as string | undefined) ?? this.defaultModel;

    return {
      model,
      system,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: compiled.rendered }]
        }
      ],
      metadata: {
        template: compiled.name,
        slots: compiled.slots,
        values: compiled.values
      }
    };
  }
}
