import type { CompiledPrompt } from '../compiler.js';
import type { SlotSchemaMap } from '../schema.js';
import type { LLMAdapter } from './types.js';

export interface OpenAIChatAdapterOptions {
  readonly model?: string;
  readonly systemPrompt?: string;
}

export class OpenAIChatAdapter implements LLMAdapter {
  public readonly name = 'openai:chat-completions';
  private readonly defaultModel: string;
  private readonly defaultSystemPrompt?: string;

  constructor(options: OpenAIChatAdapterOptions = {}) {
    this.defaultModel = options.model ?? 'gpt-4.1-mini';
    this.defaultSystemPrompt = options.systemPrompt;
  }

  format<TSlots extends SlotSchemaMap>(compiled: CompiledPrompt<TSlots>, options: Record<string, unknown> = {}) {
    const overrideModel = typeof options.model === 'string' ? (options.model as string) : undefined;
    const overrideSystem = typeof options.systemPrompt === 'string' ? (options.systemPrompt as string) : undefined;

    return {
      model: overrideModel ?? this.defaultModel,
      messages: buildMessages(compiled, overrideSystem ?? this.defaultSystemPrompt),
      metadata: {
        template: compiled.name,
        slots: Object.keys(compiled.slots),
        values: compiled.values
      }
    };
  }
}

function buildMessages<TSlots extends SlotSchemaMap>(
  compiled: CompiledPrompt<TSlots>,
  systemPrompt?: string
): Array<{ role: 'system' | 'user'; content: string }> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt ?? compiled.metadata?.systemPrompt) {
    messages.push({ role: 'system', content: String(systemPrompt ?? compiled.metadata?.systemPrompt) });
  } else if (compiled.description) {
    messages.push({ role: 'system', content: compiled.description });
  }
  messages.push({ role: 'user', content: compiled.rendered });
  return messages;
}
