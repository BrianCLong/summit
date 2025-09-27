import type { MsqeEvent, RedactionPolicy, TracePayload } from './types.js';

const DEFAULT_MASK = '[[redacted]]';

const BASE_POLICY: Required<Omit<RedactionPolicy, 'custom'>> & { readonly custom?: RedactionPolicy['custom'] } = {
  maskValue: DEFAULT_MASK,
  redactKeys: ['queryPreview', 'argsPreview', 'resultPreview'],
  redactPaths: ['events.*.metadata', 'events.*.payload'],
  redactMetadataKeys: [],
  truncateStringsAbove: 256,
  custom: undefined,
};

function mergePolicies(policy?: RedactionPolicy): Required<Omit<RedactionPolicy, 'custom'>> & { readonly custom?: RedactionPolicy['custom'] } {
  if (!policy) {
    return BASE_POLICY;
  }

  const unique = <T>(values: readonly T[] | undefined, additions: readonly T[] | undefined): readonly T[] => {
    const merged = [...(values ?? []), ...(additions ?? [])];
    return Array.from(new Set(merged));
  };

  return {
    maskValue: policy.maskValue ?? BASE_POLICY.maskValue,
    redactKeys: unique(BASE_POLICY.redactKeys, policy.redactKeys),
    redactPaths: unique(BASE_POLICY.redactPaths, policy.redactPaths),
    redactMetadataKeys: unique(BASE_POLICY.redactMetadataKeys, policy.redactMetadataKeys),
    truncateStringsAbove: policy.truncateStringsAbove ?? BASE_POLICY.truncateStringsAbove,
    custom: policy.custom ?? BASE_POLICY.custom,
  };
}

function matchesPattern(path: readonly (string | number)[], pattern: string): boolean {
  const parts = pattern.split('.');
  if (parts.length !== path.length) {
    return false;
  }
  return parts.every((part, index) => part === '*' || part === String(path[index]));
}

function shouldRedact(path: readonly (string | number)[], key: string, policy: ReturnType<typeof mergePolicies>, value: unknown): boolean {
  if (policy.redactKeys.includes(key)) {
    return true;
  }
  if (policy.redactPaths.some((pattern) => matchesPattern(path, pattern))) {
    return true;
  }
  if (policy.custom && policy.custom({ path, value })) {
    return true;
  }
  return false;
}

function maskValue(key: string, value: unknown, policy: ReturnType<typeof mergePolicies>): unknown {
  if (key === 'metadata' && value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length > 0 ? `${policy.maskValue} (keys: ${keys.join(', ')})` : policy.maskValue;
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map(() => policy.maskValue);
  }

  return policy.maskValue;
}

function truncateIfNeeded(value: unknown, policy: ReturnType<typeof mergePolicies>): unknown {
  if (typeof value === 'string' && policy.truncateStringsAbove && value.length > policy.truncateStringsAbove) {
    return `${value.slice(0, policy.truncateStringsAbove)}…`;
  }
  return value;
}

function redactValue(value: unknown, path: readonly (string | number)[], policy: ReturnType<typeof mergePolicies>): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, [...path, index], policy));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const result: Record<string, unknown> = {};

    for (const [key, raw] of entries) {
      if (raw === undefined) {
        continue;
      }

      const nextPath = [...path, key];

      if (key === 'metadataKeys' && Array.isArray(raw) && policy.redactMetadataKeys.length > 0) {
        result[key] = (raw as readonly string[]).filter(
          (entry) => !policy.redactMetadataKeys.includes(String(entry))
        );
        continue;
      }

      if (shouldRedact(nextPath, key, policy, raw)) {
        result[key] = maskValue(key, raw, policy);
        continue;
      }

      result[key] = redactValue(raw, nextPath, policy);
    }

    return result;
  }

  return truncateIfNeeded(value, policy);
}

export function applyRedactions(payload: TracePayload, policy?: RedactionPolicy): TracePayload {
  const effective = mergePolicies(policy);
  const redacted = redactValue(payload, [], effective) as TracePayload;
  return {
    ...redacted,
    events: (redacted.events as MsqeEvent[]).map((event) => ({ ...event })),
  };
}

export const DEFAULT_REDACTION_POLICY: RedactionPolicy = BASE_POLICY;
