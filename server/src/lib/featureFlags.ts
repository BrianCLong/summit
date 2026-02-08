import crypto from 'crypto';

export type FlagType = 'boolean' | 'percentage' | 'variant';

export interface BooleanFlag {
  type: 'boolean';
  defaultValue: boolean;
  description?: string;
}

export interface PercentageFlag {
  type: 'percentage';
  defaultValue: boolean;
  rollout: number; // 0-100
  description?: string;
}

export interface VariantFlag {
  type: 'variant';
  defaultValue: string;
  variants: string[];
  description?: string;
}

export type FeatureFlagDefinition = BooleanFlag | PercentageFlag | VariantFlag;
export type FeatureFlagOverride = boolean | number | string;

export interface FlagContext {
  userId?: string;
  sessionId?: string;
  tenantId?: string;
}

export interface FeatureFlagEvaluation {
  name: string;
  type: FlagType;
  value: boolean | string;
  source: 'default' | 'override';
  rollout?: number;
}

const FLAG_CATALOG: Record<string, FeatureFlagDefinition> = {
  'graph-query-optimizer': {
    type: 'boolean',
    defaultValue: false,
    description:
      'Enables the experimental IntelGraph query optimization pipeline.',
  },
  'ai-orchestrator-v2': {
    type: 'percentage',
    defaultValue: false,
    rollout: 0,
    description: 'Progressively enables the new AI/LLM orchestration strategy.',
  },
  'cache-strategy': {
    type: 'variant',
    defaultValue: 'control',
    variants: ['control', 'aggressive-cache'],
    description: 'Chooses which caching strategy to use for read-heavy paths.',
  },
  'ui-insights-panel': {
    type: 'variant',
    defaultValue: 'control',
    variants: ['control', 'insights-v2'],
    description: 'Controls the rollout of the updated insights UI panel.',
  },
  'release-criteria': {
    type: 'boolean',
    defaultValue: false,
    description: 'Enables the release criteria engine for case exports.',
  },
  'support.impersonation': {
    type: 'boolean',
    defaultValue: false,
    description: 'Enables policy-gated support impersonation flows.',
  },
  'support.healthBundle': {
    type: 'boolean',
    defaultValue: false,
    description: 'Enables export of tenant health bundles with redaction.',
  },
  'support.bundle': {
    type: 'boolean',
    defaultValue: false,
    description: 'Enables generation of support diagnostic bundles.',
  },
  'SUSPICIOUS_DETECT_ENABLED': {
    type: 'boolean',
    defaultValue: false,
    description: 'Enables detection and auditing of suspicious payloads in receipt ingestion.',
  },
  'release-readiness-dashboard': {
    type: 'boolean',
    defaultValue: true,
    description: 'Enables the Release Readiness & Evidence Explorer dashboard for GA verification.',
  },
};

const envOverrides = parseOverrideString(
  process.env.FEATURE_FLAGS,
  process.env.NODE_ENV,
);

export function get(
  flagName: string,
  context?: FlagContext,
): FeatureFlagEvaluation | undefined {
  const definition = FLAG_CATALOG[flagName];
  if (!definition) {
    return undefined;
  }

  const override = envOverrides[flagName];

  if (definition.type === 'boolean') {
    const overrideValue = coerceBoolean(override);
    const value = overrideValue ?? definition.defaultValue;
    return {
      name: flagName,
      type: definition.type,
      value,
      source: overrideValue !== undefined ? 'override' : 'default',
    };
  }

  if (definition.type === 'percentage') {
    const rollout = clampRollout(override, definition.rollout);
    const identifier = getIdentifier(context);
    const bucket = getBucket(flagName, identifier);
    const enabled = rollout > 0 && bucket < rollout;

    return {
      name: flagName,
      type: definition.type,
      value: enabled,
      rollout,
      source: override !== undefined ? 'override' : 'default',
    };
  }

  const variant = selectVariant(flagName, definition, override, context);
  return {
    name: flagName,
    type: definition.type,
    value: variant,
    source: override !== undefined ? 'override' : 'default',
  };
}

export function isEnabled(flagName: string, context?: FlagContext): boolean {
  const evaluation = get(flagName, context);
  if (!evaluation) {
    return false;
  }

  if (evaluation.type === 'variant') {
    return evaluation.value !== 'control';
  }

  return Boolean(evaluation.value);
}

export function getVariant(
  flagName: string,
  context?: FlagContext,
): string | undefined {
  const evaluation = get(flagName, context);
  if (!evaluation || evaluation.type !== 'variant') {
    return undefined;
  }

  return evaluation.value as string;
}

function parseOverrideString(
  rawValue?: string,
  nodeEnv: string | undefined = 'development',
): Record<string, FeatureFlagOverride> {
  if (!rawValue || nodeEnv === 'production') {
    return {};
  }

  return rawValue.split(',').reduce<Record<string, FeatureFlagOverride>>(
    (acc, token) => {
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
    },
    {},
  );
}

function coerceBoolean(value: FeatureFlagOverride | undefined): boolean | undefined {
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
  return undefined;
}

function clampRollout(
  override: FeatureFlagOverride | undefined,
  fallback: number,
): number {
  const base = typeof override === 'number' ? override : fallback;
  if (Number.isNaN(base)) {
    return 0;
  }
  return Math.min(100, Math.max(0, base));
}

function getIdentifier(context: FlagContext | undefined): string {
  return (
    context?.userId ||
    context?.tenantId ||
    context?.sessionId ||
    'anonymous'
  );
}

function getBucket(flagName: string, identifier: string): number {
  const hash = crypto
    .createHash('sha1')
    .update(`${flagName}:${identifier}`)
    .digest('hex')
    .slice(0, 8);
  return parseInt(hash, 16) % 100;
}

function selectVariant(
  flagName: string,
  definition: VariantFlag,
  override: FeatureFlagOverride | undefined,
  context?: FlagContext,
): string {
  if (typeof override === 'string' && definition.variants.includes(override)) {
    return override;
  }

  const variants = definition.variants.length
    ? definition.variants
    : [definition.defaultValue];
  if (variants.length === 1) {
    return variants[0];
  }

  const identifier = getIdentifier(context);
  const bucket = getBucket(flagName, identifier);
  const index = bucket % variants.length;
  return variants[index];
}

export const featureFlagCatalog = FLAG_CATALOG;
