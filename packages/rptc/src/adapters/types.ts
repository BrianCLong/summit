import type { CompiledPrompt } from '../compiler.js';
import type { SlotSchemaMap } from '../schema.js';

export interface LLMAdapter {
  readonly name: string;
  format<TSlots extends SlotSchemaMap>(compiled: CompiledPrompt<TSlots>, options?: Record<string, unknown>): unknown;
}
