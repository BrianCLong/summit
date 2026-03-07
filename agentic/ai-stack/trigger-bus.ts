import { StackEvent } from './orchestrator.js';

export function normalizeTrigger(input: any): StackEvent {
  // repo_event | schedule | webhook
  return parseAndValidate(input);
}

function parseAndValidate(input: any): StackEvent {
  if (!input || !input.id) throw new Error("Invalid trigger format");
  return { id: input.id, type: input.type || 'webhook', payload: input.payload || {} };
}
