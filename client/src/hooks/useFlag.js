"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFlag = useFlag;
exports.useFlags = useFlags;
exports.useFlagUpdater = useFlagUpdater;
const react_1 = require("react");
const env_js_1 = require("../config/env.js");
// Default feature flags configuration
const DEFAULT_FLAGS = {
    'realtime-presence': {
        enabled: true,
        rollout: 100,
        conditions: {
            env: ['development', 'staging', 'production'],
        },
    },
    'graph-streaming': {
        enabled: true,
        rollout: 80,
        conditions: {
            env: ['development', 'staging', 'production'],
        },
    },
    'graph-lod': {
        enabled: true,
        rollout: 100,
        conditions: {
            env: ['development', 'staging', 'production'],
        },
    },
    'graph-lod-aggregation': {
        enabled: true,
        rollout: 100,
        conditions: {
            env: ['development', 'staging', 'production'],
        },
    },
    'graph-lod-benchmark': {
        enabled: env_js_1.DEV ?? true,
        rollout: 100,
        conditions: {
            env: ['development', 'staging', 'production'],
        },
    },
    'k-shortest-paths': {
        enabled: true,
        rollout: 100,
        conditions: {
            env: ['development', 'staging'],
        },
    },
    'advanced-search': {
        enabled: true,
        rollout: 100,
    },
    'bulk-actions': {
        enabled: true,
        rollout: 90,
    },
    'report-templates': {
        enabled: true,
        rollout: 100,
        conditions: {
            role: ['analyst', 'admin', 'investigator'],
        },
    },
    'forensics-reports': {
        enabled: true,
        rollout: 100,
        conditions: {
            role: ['forensics', 'admin', 'legal'],
        },
    },
    'fps-monitor': {
        enabled: import.meta.env.DEV,
        rollout: 100,
        conditions: {
            env: ['development'],
        },
    },
    'event-inspector': {
        enabled: env_js_1.DEV,
        rollout: 100,
        conditions: {
            env: ['development'],
        },
    },
    'optimistic-updates': {
        enabled: true,
        rollout: 75,
    },
    'multi-language': {
        enabled: true,
        rollout: 50,
        conditions: {
            env: ['staging', 'production'],
        },
    },
    'otel.correlation': {
        enabled: true,
        rollout: 100,
    },
};
/**
 * Feature flag hook with env/tenant/role fallback
 */
function useFlag(flagKey, context) {
    const [dynamicFlags, setDynamicFlags] = (0, react_1.useState)({});
    // Load dynamic flags from server/localStorage (simplified implementation)
    (0, react_1.useEffect)(() => {
        const storedFlags = localStorage.getItem('feature-flags');
        if (storedFlags) {
            try {
                setDynamicFlags(JSON.parse(storedFlags));
            }
            catch (error) {
                console.warn('Failed to parse stored feature flags:', error);
            }
        }
    }, []);
    const isEnabled = (0, react_1.useMemo)(() => {
        const flags = { ...DEFAULT_FLAGS, ...dynamicFlags };
        const flag = flags[flagKey];
        if (!flag) {
            console.warn(`Feature flag "${flagKey}" not found`);
            return false;
        }
        // Check if flag is globally disabled
        if (!flag.enabled) {
            return false;
        }
        // Check rollout percentage
        if (flag.rollout && flag.rollout < 100) {
            const hash = hashString(`${flagKey}-${context?.userId || 'anonymous'}`);
            const bucket = hash % 100;
            if (bucket >= flag.rollout) {
                return false;
            }
        }
        // Check conditions
        if (flag.conditions) {
            const { env, tenant, role, user } = flag.conditions;
            // Environment check
            if (env && context?.env && !env.includes(context.env)) {
                return false;
            }
            // Tenant check
            if (tenant && context?.tenantId && !tenant.includes(context.tenantId)) {
                return false;
            }
            // Role check
            if (role && context?.role && !role.includes(context.role)) {
                return false;
            }
            // User check
            if (user && context?.userId && !user.includes(context.userId)) {
                return false;
            }
        }
        return true;
    }, [flagKey, dynamicFlags, context]);
    return isEnabled;
}
/**
 * Hook to get all available flags with their status
 */
function useFlags(context) {
    const [dynamicFlags] = (0, react_1.useState)({});
    return (0, react_1.useMemo)(() => {
        const flags = { ...DEFAULT_FLAGS, ...dynamicFlags };
        const result = {};
        for (const flagKey of Object.keys(flags)) {
            result[flagKey] = useFlag(flagKey, context);
        }
        return result;
    }, [dynamicFlags, context]);
}
/**
 * Hook for updating feature flags (admin use)
 */
function useFlagUpdater() {
    const updateFlag = (flagKey, config) => {
        const storedFlags = localStorage.getItem('feature-flags');
        let flags = {};
        if (storedFlags) {
            try {
                flags = JSON.parse(storedFlags);
            }
            catch (error) {
                console.warn('Failed to parse stored flags:', error);
            }
        }
        flags[flagKey] = { ...flags[flagKey], ...config };
        localStorage.setItem('feature-flags', JSON.stringify(flags));
        // Trigger re-evaluation
        window.dispatchEvent(new CustomEvent('feature-flags-updated'));
    };
    return { updateFlag };
}
// Simple hash function for consistent bucketing
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}
