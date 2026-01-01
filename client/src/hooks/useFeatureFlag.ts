import { useEffect, useMemo, useState } from 'react';
import { PROD, VITE_FEATURE_FLAGS } from '../config/env.js';

type FlagType = 'boolean' | 'percentage' | 'variant';

type FlagDefinition =
  | { type: 'boolean'; defaultValue: boolean }
  | { type: 'percentage'; defaultValue: boolean; rollout: number }
  | { type: 'variant'; defaultValue: string; variants: string[] };

type OverrideValue = boolean | number | string;

type FlagContext = {
  userId?: string;
  sessionId?: string;
  tenantId?: string;
};

type Evaluation = {
  enabled: boolean;
  variant?: string;
  type: FlagType;
};

const FLAG_CATALOG: Record<string, FlagDefinition> = {
  'graph-query-optimizer': { type: 'boolean', defaultValue: false },
  'ai-orchestrator-v2': { type: 'percentage', defaultValue: false, rollout: 0 },
  'cache-strategy': {
    type: 'variant',
    defaultValue: 'control',
    variants: ['control', 'aggressive-cache'],
  },
  'ui-insights-panel': {
    type: 'variant',
    defaultValue: 'control',
    variants: ['control', 'insights-v2'],
  },
  'ui.a11yGuardrails': { type: 'boolean', defaultValue: true },
};

const envOverrides = parseOverrides(VITE_FEATURE_FLAGS, PROD);

export function useFeatureFlag(
  flagName: string,
  context?: FlagContext,
): boolean {
  const [overrides, setOverrides] = useState<OverrideValueMap>(() =>
    buildOverrides(envOverrides),
  );

  useEffect(() => {
    const listener = () => setOverrides(buildOverrides(envOverrides));
    window.addEventListener('feature-flags-updated', listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener('feature-flags-updated', listener);
      window.removeEventListener('storage', listener);
    };
  }, []);

  return useMemo(() => {
    const evaluation = evaluateFlag(flagName, overrides, context);
    return evaluation.enabled;
  }, [flagName, overrides, context]);
}

export function useFeatureVariant(
  flagName: string,
  context?: FlagContext,
): string | undefined {
  const [overrides, setOverrides] = useState<OverrideValueMap>(() =>
    buildOverrides(envOverrides),
  );

  useEffect(() => {
    const listener = () => setOverrides(buildOverrides(envOverrides));
    window.addEventListener('feature-flags-updated', listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener('feature-flags-updated', listener);
      window.removeEventListener('storage', listener);
    };
  }, []);

  return useMemo(() => {
    const evaluation = evaluateFlag(flagName, overrides, context);
    return evaluation.variant;
  }, [flagName, overrides, context]);
}

type OverrideValueMap = Record<string, OverrideValue>;

function evaluateFlag(
  flagName: string,
  overrides: OverrideValueMap,
  context?: FlagContext,
): Evaluation {
  const definition = FLAG_CATALOG[flagName];

  if (!definition) {
    return { enabled: false, type: 'boolean' };
  }

  const override = overrides[flagName];

  if (definition.type === 'boolean') {
    const value = coerceBoolean(override, definition.defaultValue);
    return { enabled: value, type: 'boolean' };
  }

  if (definition.type === 'percentage') {
    const rollout = clampRollout(
      typeof override === 'number' ? override : definition.rollout,
    );
    const identifier = getIdentifier(context);
    const bucket = getBucket(`${flagName}:${identifier}`);
    const enabled = rollout > 0 && bucket < rollout;
    return { enabled, type: 'percentage' };
  }

  const variant = selectVariant(definition, override, context, flagName);
  return {
    enabled: variant !== 'control',
    variant,
    type: 'variant',
  };
}

function buildOverrides(seed: OverrideValueMap): OverrideValueMap {
  const local = parseOverrides(readLocalOverrides(), PROD);
  return { ...seed, ...local };
}

function parseOverrides(
  rawValue?: string,
  isProd: boolean = false,
): OverrideValueMap {
  if (!rawValue || isProd) {
    return {};
  }

  return rawValue.split(',').reduce<OverrideValueMap>((acc, token) => {
    const [key, value] = token.split('=').map((part) => part.trim());
    if (!key || value === undefined) {
      return acc;
    }

    if (value.endsWith('%')) {
      const percentValue = Number.parseInt(value.slice(0, -1), 10);
      if (!Number.isNaN(percentValue)) {
        acc[key] = percentValue;
      }
      return acc;
    }

    if (value.toLowerCase() === 'true') {
      acc[key] = true;
      return acc;
    }

    if (value.toLowerCase() === 'false') {
      acc[key] = false;
      return acc;
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      acc[key] = numeric;
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
}

function readLocalOverrides(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem('featureFlagOverrides') || undefined;
}

function coerceBoolean(value: OverrideValue | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  return fallback;
}

function clampRollout(rollout: number): number {
  if (Number.isNaN(rollout)) {
    return 0;
  }
  return Math.min(100, Math.max(0, rollout));
}

function getBucket(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

function getIdentifier(context?: FlagContext): string {
  return (
    context?.userId || context?.tenantId || context?.sessionId || 'anonymous'
  );
}

function selectVariant(
  definition: Extract<FlagDefinition, { type: 'variant' }>,
  override: OverrideValue | undefined,
  context: FlagContext | undefined,
  flagName: string,
): string {
  if (typeof override === 'string' && definition.variants.includes(override)) {
    return override;
  }

  if (definition.variants.length <= 1) {
    return definition.defaultValue;
  }

  const bucket = getBucket(`${flagName}:${getIdentifier(context)}`);
  const index = bucket % definition.variants.length;
  return definition.variants[index];
}
