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
exports.NetworkProvider = NetworkProvider;
exports.useNetwork = useNetwork;
/**
 * Network Context
 * Provides network status awareness across the app
 */
const react_1 = __importStar(require("react"));
const syncEngine_1 = require("@/lib/syncEngine");
const NetworkContext = (0, react_1.createContext)(undefined);
function NetworkProvider({ children }) {
    const [status, setStatus] = (0, react_1.useState)(navigator.onLine ? 'online' : 'offline');
    const [effectiveType, setEffectiveType] = (0, react_1.useState)(null);
    const [downlink, setDownlink] = (0, react_1.useState)(null);
    const [rtt, setRtt] = (0, react_1.useState)(null);
    // Get network connection object
    const getConnection = () => {
        const nav = navigator;
        return nav.connection || nav.mozConnection || nav.webkitConnection;
    };
    // Update network info
    const updateNetworkInfo = (0, react_1.useCallback)(() => {
        const connection = getConnection();
        if (connection) {
            setEffectiveType(connection.effectiveType);
            setDownlink(connection.downlink);
            setRtt(connection.rtt);
            // Determine if connection is slow
            const isSlow = connection.effectiveType === '2g' ||
                connection.effectiveType === 'slow-2g' ||
                connection.rtt > 500 ||
                connection.downlink < 0.5;
            if (!navigator.onLine) {
                setStatus('offline');
            }
            else if (isSlow) {
                setStatus('slow');
            }
            else {
                setStatus('online');
            }
        }
        else {
            setStatus(navigator.onLine ? 'online' : 'offline');
        }
    }, []);
    // Check actual connection by making a request
    const checkConnection = (0, react_1.useCallback)(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch('/api/health', {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store',
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch {
            return false;
        }
    }, []);
    (0, react_1.useEffect)(() => {
        // Initial update
        updateNetworkInfo();
        // Online/offline events
        const handleOnline = () => {
            updateNetworkInfo();
            syncEngine_1.syncEngine.syncAll(); // Trigger sync when coming online
        };
        const handleOffline = () => {
            setStatus('offline');
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        // Network Information API events
        const connection = getConnection();
        if (connection) {
            connection.addEventListener('change', updateNetworkInfo);
        }
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (connection) {
                connection.removeEventListener('change', updateNetworkInfo);
            }
        };
    }, [updateNetworkInfo]);
    const value = {
        status,
        isOnline: status !== 'offline',
        isSlow: status === 'slow',
        effectiveType,
        downlink,
        rtt,
        checkConnection,
    };
    return (<NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>);
}
function useNetwork() {
    const context = (0, react_1.useContext)(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}
