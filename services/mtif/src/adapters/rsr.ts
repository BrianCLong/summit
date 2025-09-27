import type { GuardRuleUpdate, StixObject } from '../types.js';
import { SigningService } from '../utils/signing.js';

const normalizeRule = (object: StixObject): Record<string, unknown> => {
  let extension: Record<string, unknown> | undefined;
  if ('extensions' in object && object.extensions) {
    const raw = (object.extensions as Record<string, unknown>)['x-llm-threat-extension'];
    if (raw && typeof raw === 'object') {
      extension = raw as Record<string, unknown>;
    }
  }

  if (object.type === 'attack-pattern') {
    return {
      guard: 'response-filter',
      guidance: extension?.['mitigation'],
      prompt_signature: extension?.['prompt_hash']
    };
  }

  if (object.type === 'indicator') {
    return {
      guard: 'tool-suppression',
      pattern: object.pattern,
      severity: extension?.['severity'],
      response: extension?.['response']
    };
  }

  return { guard: 'reference', id: object.id };
};

export const exportToRsr = (
  objects: StixObject[],
  signing: SigningService,
  version = '1.0.0'
): GuardRuleUpdate => {
  const rules = objects.map((object) => ({
    id: `rsr-${object.id}`,
    description: object.description ?? object.type,
    payload: normalizeRule(object)
  }));

  const unsigned: Omit<GuardRuleUpdate, 'signature'> = {
    id: `update--rsr-${Date.now()}`,
    framework: 'RSR',
    version,
    generated_at: new Date().toISOString(),
    rules
  };

  return {
    ...unsigned,
    signature: signing.sign({ ...unsigned })
  };
};
