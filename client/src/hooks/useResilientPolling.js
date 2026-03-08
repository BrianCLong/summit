"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useResilientPolling = useResilientPolling;
const react_1 = require("react");
const useNetworkStatus_1 = require("./useNetworkStatus");
/**
 * Hook that provides resilient polling with network-aware features:
 * - Automatically pauses polling when offline
 * - Optionally triggers refresh when reconnecting
 * - Prevents concurrent requests when configured
 * - Cleans up intervals properly
 *
 * @param pollingFn - The async function to call on each poll
 * @param options - Configuration options
 */
function useResilientPolling(pollingFn, options) {
    const { interval, enabled = true, refreshOnReconnect = true, preventConcurrent = true, } = options;
    const { isOnline, wasOffline } = (0, useNetworkStatus_1.useNetworkStatus)();
    const intervalRef = (0, react_1.useRef)(null);
    const isPollingRef = (0, react_1.useRef)(false);
    const pollingFnRef = (0, react_1.useRef)(pollingFn);
    // Keep pollingFn ref updated
    (0, react_1.useEffect)(() => {
        pollingFnRef.current = pollingFn;
    }, [pollingFn]);
    const executePoll = (0, react_1.useCallback)(async () => {
        // Skip if concurrent prevention is enabled and already polling
        if (preventConcurrent && isPollingRef.current) {
            return;
        }
        // Skip if offline
        if (!isOnline) {
            return;
        }
        isPollingRef.current = true;
        try {
            await pollingFnRef.current();
        }
        catch (error) {
            console.error('Polling error:', error);
        }
        finally {
            isPollingRef.current = false;
        }
    }, [isOnline, preventConcurrent]);
    // Handle reconnect refresh
    (0, react_1.useEffect)(() => {
        if (refreshOnReconnect && wasOffline && isOnline && enabled) {
            executePoll();
        }
    }, [wasOffline, isOnline, refreshOnReconnect, enabled, executePoll]);
    // Set up polling interval
    (0, react_1.useEffect)(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        // Don't set up polling if disabled or offline
        if (!enabled || !isOnline) {
            return;
        }
        // Set up new interval
        intervalRef.current = setInterval(executePoll, interval);
        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [interval, enabled, isOnline, executePoll]);
    return {
        isPolling: isPollingRef.current,
        isOnline,
        triggerPoll: executePoll,
    };
}
