"use strict";
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
exports.FeatureFlagProvider = FeatureFlagProvider;
exports.useFeatureFlags = useFeatureFlags;
// @ts-nocheck
const react_1 = __importStar(require("react"));
const AuthContext_1 = require("./AuthContext");
const FeatureFlagContext = (0, react_1.createContext)(undefined);
function FeatureFlagProvider({ children }) {
    const [flags, setFlags] = (0, react_1.useState)({});
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const { user, token } = (0, AuthContext_1.useAuth)();
    const fetchFlags = (0, react_1.useCallback)(async () => {
        if (!token)
            return;
        try {
            const response = await fetch('/api/feature-flags/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    context: {
                        // Context is augmented by server based on token,
                        // but we can add client-side context here (e.g., URL params, device info)
                        url: window.location.href,
                        userAgent: navigator.userAgent
                    }
                })
            });
            if (!response.ok) {
                throw new Error('Failed to fetch feature flags');
            }
            const data = await response.json();
            setFlags(data);
            setError(null);
        }
        catch (err) {
            console.error('Error loading feature flags:', err);
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    (0, react_1.useEffect)(() => {
        if (user) {
            fetchFlags();
        }
        else {
            setLoading(false);
        }
    }, [user, fetchFlags]);
    const isEnabled = (0, react_1.useCallback)((key, defaultValue = false) => {
        if (flags[key] !== undefined) {
            return Boolean(flags[key]);
        }
        return defaultValue;
    }, [flags]);
    const getVariant = (0, react_1.useCallback)((key, defaultValue) => {
        if (flags[key] !== undefined) {
            return flags[key];
        }
        return defaultValue;
    }, [flags]);
    return (<FeatureFlagContext.Provider value={{ flags, isEnabled, getVariant, reloadFlags: fetchFlags, loading, error }}>
      {children}
    </FeatureFlagContext.Provider>);
}
function useFeatureFlags() {
    const context = (0, react_1.useContext)(FeatureFlagContext);
    if (context === undefined) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
    }
    return context;
}
