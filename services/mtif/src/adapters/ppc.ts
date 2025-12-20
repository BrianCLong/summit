import type { GuardRuleUpdate, StixObject } from '../types.js';
import { SigningService } from '../utils/signing.js';

const serializeRulePayload = (object: StixObject): Record<string, unknown> => {
  let extension: Record<string, unknown> | undefined;
  if ('extensions' in object && object.extensions) {
    const raw = (object.extensions as Record<string, unknown>)['x-llm-threat-extension'];
    if (raw && typeof raw === 'object') {
      extension = raw as Record<string, unknown>;
    }
  }

  if (object.type === 'attack-pattern') {
    return {
      kind: 'prompt-block',
      name: object.name,
      llm_family: extension?.['llm_family'],
      prompt: extension?.['prompt'],
      severity: extension?.['severity']
    };
  }

  if (object.type === 'indicator') {
    return {
      kind: 'tool-usage',
      pattern: object.pattern,
      llm_family: extension?.['llm_family'],
      mitigation: extension?.['mitigation']
    };
  }

  return { kind: object.type };
};

export const exportToPpc = (
  objects: StixObject[],
  signing: SigningService,
  version = '1.0.0'
): GuardRuleUpdate => {
  const rules = objects.map((object) => ({
    id: `ppc-${object.id}`,
    description: object.description ?? object.type,
    payload: serializeRulePayload(object)
  }));

  const unsigned: Omit<GuardRuleUpdate, 'signature'> = {
    id: `update--ppc-${Date.now()}`,
    framework: 'PPC',
    version,
    generated_at: new Date().toISOString(),
    rules
  };

  return {
    ...unsigned,
    signature: signing.sign({ ...unsigned })
  };
};
