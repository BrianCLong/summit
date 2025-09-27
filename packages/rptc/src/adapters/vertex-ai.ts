import type { CompiledPrompt } from '../compiler.js';
import type { SlotSchemaMap } from '../schema.js';
import type { LLMAdapter } from './types.js';

export interface VertexAIAdapterOptions {
  readonly model?: string;
}

export class VertexAIAdapter implements LLMAdapter {
  public readonly name = 'google-vertex:responses';
  private readonly defaultModel: string;

  constructor(options: VertexAIAdapterOptions = {}) {
    this.defaultModel = options.model ?? 'gemini-1.5-pro';
  }

  format<TSlots extends SlotSchemaMap>(compiled: CompiledPrompt<TSlots>, options: Record<string, unknown> = {}) {
    const model = (options.model as string | undefined) ?? this.defaultModel;
    return {
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: compiled.rendered }]
        }
      ],
      metadata: {
        template: compiled.name,
        description: compiled.description,
        values: compiled.values
      }
    };
  }
}
