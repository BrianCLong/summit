"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagCatalog = void 0;
exports.get = get;
exports.isEnabled = isEnabled;
exports.getVariant = getVariant;
const crypto_1 = __importDefault(require("crypto"));
const FLAG_CATALOG = {
    'graph-query-optimizer': {
        type: 'boolean',
        defaultValue: false,
        description: 'Enables the experimental IntelGraph query optimization pipeline.',
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
const envOverrides = parseOverrideString(process.env.FEATURE_FLAGS, process.env.NODE_ENV);
function get(flagName, context) {
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
function isEnabled(flagName, context) {
    const evaluation = get(flagName, context);
    if (!evaluation) {
        return false;
    }
    if (evaluation.type === 'variant') {
        return evaluation.value !== 'control';
    }
    return Boolean(evaluation.value);
}
function getVariant(flagName, context) {
    const evaluation = get(flagName, context);
    if (!evaluation || evaluation.type !== 'variant') {
        return undefined;
    }
    return evaluation.value;
}
function parseOverrideString(rawValue, nodeEnv = 'development') {
    if (!rawValue || nodeEnv === 'production') {
        return {};
    }
    return rawValue.split(',').reduce((acc, token) => {
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
function coerceBoolean(value) {
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
function clampRollout(override, fallback) {
    const base = typeof override === 'number' ? override : fallback;
    if (Number.isNaN(base)) {
        return 0;
    }
    return Math.min(100, Math.max(0, base));
}
function getIdentifier(context) {
    return (context?.userId ||
        context?.tenantId ||
        context?.sessionId ||
        'anonymous');
}
function getBucket(flagName, identifier) {
    const hash = crypto_1.default
        .createHash('sha1')
        .update(`${flagName}:${identifier}`)
        .digest('hex')
        .slice(0, 8);
    return parseInt(hash, 16) % 100;
}
function selectVariant(flagName, definition, override, context) {
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
exports.featureFlagCatalog = FLAG_CATALOG;
