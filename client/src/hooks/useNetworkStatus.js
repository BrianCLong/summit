"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNetworkStatus = useNetworkStatus;
const react_1 = require("react");
/**
 * Hook that tracks network connectivity status.
 * Uses the Navigator.onLine API and online/offline events.
 *
 * @returns NetworkStatus object with current connectivity state
 */
function useNetworkStatus() {
    const [isOnline, setIsOnline] = (0, react_1.useState)(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [wasOffline, setWasOffline] = (0, react_1.useState)(false);
    const [lastChanged, setLastChanged] = (0, react_1.useState)(null);
    const handleOnline = (0, react_1.useCallback)(() => {
        setIsOnline(true);
        setLastChanged(Date.now());
        // wasOffline remains true until consumer acknowledges
    }, []);
    const handleOffline = (0, react_1.useCallback)(() => {
        setIsOnline(false);
        setWasOffline(true);
        setLastChanged(Date.now());
    }, []);
    (0, react_1.useEffect)(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);
    // Reset wasOffline when online status is acknowledged
    (0, react_1.useEffect)(() => {
        if (isOnline && wasOffline) {
            // Give consumers time to react to wasOffline before clearing
            const timeout = setTimeout(() => {
                setWasOffline(false);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [isOnline, wasOffline]);
    return { isOnline, wasOffline, lastChanged };
}
