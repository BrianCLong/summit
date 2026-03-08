"use strict";
/**
 * React Integration
 *
 * React hooks and components for feature flags
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleFeatureFlagClient = exports.FeatureVariation = exports.FeatureFlag = exports.FeatureFlagProvider = void 0;
exports.useFeatureFlags = useFeatureFlags;
exports.useFeatureFlag = useFeatureFlag;
exports.useStringFlag = useStringFlag;
exports.useNumberFlag = useNumberFlag;
exports.useJSONFlag = useJSONFlag;
exports.useFeatureFlagTracker = useFeatureFlagTracker;
const react_1 = __importStar(require("react"));
/**
 * Feature flag context
 */
const FeatureFlagContext = (0, react_1.createContext)({
    client: null,
    flags: {},
    isLoading: true,
    error: null,
    context: {},
    updateContext: () => { },
});
/**
 * Feature flag provider
 */
const FeatureFlagProvider = ({ client, apiEndpoint, initialContext = {}, bootstrapFlags = {}, pollingInterval = 0, children, }) => {
    const [flags, setFlags] = (0, react_1.useState)(bootstrapFlags);
    const [isLoading, setIsLoading] = (0, react_1.useState)(!bootstrapFlags || Object.keys(bootstrapFlags).length === 0);
    const [error, setError] = (0, react_1.useState)(null);
    const [context, setContext] = (0, react_1.useState)(initialContext);
    const [clientInstance, setClientInstance] = (0, react_1.useState)(client || null);
    // Fetch flags from API
    const fetchFlags = (0, react_1.useCallback)(async () => {
        if (!apiEndpoint && !client) {
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            if (client) {
                const allFlags = client.getAllFlags();
                setFlags(allFlags);
            }
            else if (apiEndpoint) {
                const response = await fetch(apiEndpoint, {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
                }
                const data = await response.json();
                setFlags(data.flags || {});
                // Update context from server if provided
                if (data.context) {
                    setContext((prev) => ({ ...prev, ...data.context }));
                }
            }
        }
        catch (err) {
            setError(err);
            console.error('Error fetching feature flags:', err);
        }
        finally {
            setIsLoading(false);
        }
    }, [apiEndpoint, client]);
    // Initial fetch
    (0, react_1.useEffect)(() => {
        fetchFlags();
    }, [fetchFlags]);
    // Polling
    (0, react_1.useEffect)(() => {
        if (pollingInterval > 0) {
            const interval = setInterval(fetchFlags, pollingInterval);
            return () => clearInterval(interval);
        }
    }, [fetchFlags, pollingInterval]);
    // Subscribe to client changes if provided
    (0, react_1.useEffect)(() => {
        if (client) {
            const unsubscribe = client.subscribe((updatedFlags) => {
                setFlags(updatedFlags);
            });
            return unsubscribe;
        }
    }, [client]);
    // Update context
    const updateContext = (0, react_1.useCallback)((newContext) => {
        setContext((prev) => ({ ...prev, ...newContext }));
        if (client) {
            client.updateContext(newContext);
        }
        // Re-fetch flags with new context
        fetchFlags();
    }, [client, fetchFlags]);
    const value = (0, react_1.useMemo)(() => ({
        client: clientInstance,
        flags,
        isLoading,
        error,
        context,
        updateContext,
    }), [clientInstance, flags, isLoading, error, context, updateContext]);
    return (<FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>);
};
exports.FeatureFlagProvider = FeatureFlagProvider;
/**
 * Hook to access feature flags
 */
function useFeatureFlags() {
    const context = (0, react_1.useContext)(FeatureFlagContext);
    if (!context) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
    }
    return context;
}
/**
 * Hook to check if a boolean flag is enabled
 */
function useFeatureFlag(key, defaultValue = false) {
    const { flags, client } = useFeatureFlags();
    if (client) {
        return client.getBooleanFlag(key, defaultValue);
    }
    const value = flags[key];
    if (value === undefined || value === null) {
        return defaultValue;
    }
    return Boolean(value);
}
/**
 * Hook to get a string flag value
 */
function useStringFlag(key, defaultValue = '') {
    const { flags, client } = useFeatureFlags();
    if (client) {
        return client.getStringFlag(key, defaultValue);
    }
    const value = flags[key];
    if (value === undefined || value === null) {
        return defaultValue;
    }
    return String(value);
}
/**
 * Hook to get a number flag value
 */
function useNumberFlag(key, defaultValue = 0) {
    const { flags, client } = useFeatureFlags();
    if (client) {
        return client.getNumberFlag(key, defaultValue);
    }
    const value = flags[key];
    if (value === undefined || value === null) {
        return defaultValue;
    }
    return Number(value);
}
/**
 * Hook to get a JSON flag value
 */
function useJSONFlag(key, defaultValue) {
    const { flags, client } = useFeatureFlags();
    if (client) {
        return client.getJSONFlag(key, defaultValue);
    }
    const value = flags[key];
    if (value === undefined || value === null) {
        return defaultValue;
    }
    return value;
}
/**
 * Hook to track events
 */
function useFeatureFlagTracker() {
    const { client } = useFeatureFlags();
    return (0, react_1.useCallback)((eventName, data) => {
        if (client) {
            client.track(eventName, data);
        }
    }, [client]);
}
/**
 * Feature flag component
 */
const FeatureFlag = ({ flag, defaultValue = false, children, fallback = null, }) => {
    const isEnabled = useFeatureFlag(flag, defaultValue);
    return <>{isEnabled ? children : fallback}</>;
};
exports.FeatureFlag = FeatureFlag;
/**
 * Feature variation component
 */
const FeatureVariation = ({ flag, defaultVariation, variations, fallback = null, }) => {
    const variation = useStringFlag(flag, defaultVariation);
    const content = variations[variation];
    return <>{content ?? fallback}</>;
};
exports.FeatureVariation = FeatureVariation;
/**
 * Simple in-memory feature flag client
 */
class SimpleFeatureFlagClient {
    flags;
    context;
    subscribers;
    constructor(initialFlags = {}, initialContext = {}) {
        this.flags = initialFlags;
        this.context = initialContext;
        this.subscribers = new Set();
    }
    getBooleanFlag(key, defaultValue) {
        const value = this.flags[key];
        if (value === undefined || value === null) {
            return defaultValue;
        }
        return Boolean(value);
    }
    getStringFlag(key, defaultValue) {
        const value = this.flags[key];
        if (value === undefined || value === null) {
            return defaultValue;
        }
        return String(value);
    }
    getNumberFlag(key, defaultValue) {
        const value = this.flags[key];
        if (value === undefined || value === null) {
            return defaultValue;
        }
        return Number(value);
    }
    getJSONFlag(key, defaultValue) {
        const value = this.flags[key];
        if (value === undefined || value === null) {
            return defaultValue;
        }
        return value;
    }
    getAllFlags() {
        return { ...this.flags };
    }
    track(eventName, data) {
        // Simple implementation - just log
        console.debug('Feature flag event:', eventName, data);
    }
    updateContext(context) {
        this.context = { ...this.context, ...context };
    }
    updateFlags(flags) {
        this.flags = { ...this.flags, ...flags };
        this.notifySubscribers();
    }
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }
    notifySubscribers() {
        const flags = this.getAllFlags();
        this.subscribers.forEach((callback) => callback(flags));
    }
}
exports.SimpleFeatureFlagClient = SimpleFeatureFlagClient;
