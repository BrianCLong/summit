import { z } from 'zod';

export type RedactionRule = {
  path: string;
  replacement?: string;
};

export interface ActionContract<TArgs, TResult> {
  toolName: string;
  argsSchema: z.ZodSchema<TArgs>;
  outputSchema: z.ZodSchema<TResult>;
  postcondition?: (result: TResult) => { ok: boolean; issues?: string[] };
  redactionRules?: RedactionRule[];
}

export class ActionContractRegistry {
  private contracts = new Map<string, ActionContract<unknown, unknown>>();

  register<TArgs, TResult>(contract: ActionContract<TArgs, TResult>): void {
    this.contracts.set(contract.toolName, contract as ActionContract<unknown, unknown>);
  }

  get(toolName: string): ActionContract<unknown, unknown> | undefined {
    return this.contracts.get(toolName);
  }

  list(): ActionContract<unknown, unknown>[] {
    return Array.from(this.contracts.values());
  }
}

export function applyRedactionRules<T>(value: T, rules: RedactionRule[] = []): T {
  if (rules.length === 0) {
    return value;
  }

  const cloned = JSON.parse(JSON.stringify(value)) as T;

  for (const rule of rules) {
    const replacement = rule.replacement ?? '[REDACTED]';
    const segments = rule.path.split('.').filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    let target: Record<string, unknown> | undefined = cloned as unknown as Record<string, unknown>;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const key = segments[i];
      const next = target?.[key];
      if (next && typeof next === 'object') {
        target = next as Record<string, unknown>;
      } else {
        target = undefined;
        break;
      }
    }

    if (target) {
      const lastKey = segments[segments.length - 1];
      if (lastKey in target) {
        target[lastKey] = replacement;
      }
    }
  }

  return cloned;
}
