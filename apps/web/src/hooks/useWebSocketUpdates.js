"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebSocketUpdates = useWebSocketUpdates;
exports.useRunUpdates = useRunUpdates;
exports.useApprovalUpdates = useApprovalUpdates;
exports.useSystemAlerts = useSystemAlerts;
const react_1 = require("react");
const config_1 = __importDefault(require("../config"));
function useWebSocketUpdates(wsConfig = {}) {
    const { url = config_1.default.env === 'development'
        ? 'ws://localhost:3001/ws/maestro'
        : `wss://${window.location.host}/ws/maestro`, reconnectInterval = 3000, maxReconnectAttempts = 10, heartbeatInterval = 30000, } = wsConfig;
    const wsRef = (0, react_1.useRef)(null);
    const heartbeatRef = (0, react_1.useRef)(null);
    const reconnectTimeoutRef = (0, react_1.useRef)(null);
    const [state, setState] = (0, react_1.useState)({
        isConnected: false,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
        lastMessage: null,
    });
    const [listeners, setListeners] = (0, react_1.useState)(new Map());
    const startHeartbeat = (0, react_1.useCallback)(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
        }
        heartbeatRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
            }
        }, heartbeatInterval);
    }, [heartbeatInterval]);
    const stopHeartbeat = (0, react_1.useCallback)(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    }, []);
    const connect = (0, react_1.useCallback)(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING ||
            wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }
        setState(prev => ({ ...prev, isConnecting: true, error: null }));
        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;
            ws.onopen = () => {
                console.log('Maestro WebSocket connected');
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    isConnecting: false,
                    error: null,
                    reconnectAttempts: 0,
                }));
                startHeartbeat();
                // Subscribe to updates on connection
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    topics: [
                        'run_updates',
                        'approval_requests',
                        'router_decisions',
                        'system_alerts',
                    ],
                }));
            };
            ws.onmessage = event => {
                try {
                    const message = JSON.parse(event.data);
                    setState(prev => ({
                        ...prev,
                        lastMessage: message,
                    }));
                    // Dispatch to type-specific listeners
                    const typeListeners = listeners.get(message.type);
                    if (typeListeners) {
                        typeListeners.forEach(callback => {
                            try {
                                callback(message.payload);
                            }
                            catch (error) {
                                console.error(`Error in WebSocket listener for type ${message.type}:`, error);
                            }
                        });
                    }
                    // Dispatch to 'all' listeners
                    const allListeners = listeners.get('*');
                    if (allListeners) {
                        allListeners.forEach(callback => {
                            try {
                                callback(message);
                            }
                            catch (error) {
                                console.error('Error in WebSocket wildcard listener:', error);
                            }
                        });
                    }
                }
                catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            ws.onerror = error => {
                console.error('Maestro WebSocket error:', error);
                setState(prev => ({
                    ...prev,
                    error: 'WebSocket connection error',
                    isConnecting: false,
                }));
            };
            ws.onclose = event => {
                console.log('Maestro WebSocket disconnected:', event.code, event.reason);
                stopHeartbeat();
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    isConnecting: false,
                    error: event.code === 1000
                        ? null
                        : `Connection closed: ${event.reason || event.code}`,
                }));
                // Attempt to reconnect if not a clean closure
                if (event.code !== 1000 &&
                    state.reconnectAttempts < maxReconnectAttempts) {
                    setState(prev => ({
                        ...prev,
                        reconnectAttempts: prev.reconnectAttempts + 1,
                    }));
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval * Math.pow(1.5, state.reconnectAttempts));
                }
            };
        }
        catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to create WebSocket connection',
                isConnecting: false,
            }));
        }
    }, [
        url,
        state.reconnectAttempts,
        maxReconnectAttempts,
        reconnectInterval,
        listeners,
        startHeartbeat,
        stopHeartbeat,
    ]);
    const disconnect = (0, react_1.useCallback)(() => {
        stopHeartbeat();
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close(1000, 'Manual disconnect');
            wsRef.current = null;
        }
        setState({
            isConnected: false,
            isConnecting: false,
            error: null,
            reconnectAttempts: 0,
            lastMessage: null,
        });
    }, [stopHeartbeat]);
    const send = (0, react_1.useCallback)((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        console.warn('WebSocket not connected, cannot send message:', message);
        return false;
    }, []);
    const subscribe = (0, react_1.useCallback)((messageType, callback) => {
        setListeners(prev => {
            const newListeners = new Map(prev);
            if (!newListeners.has(messageType)) {
                newListeners.set(messageType, new Set());
            }
            newListeners.get(messageType).add(callback);
            return newListeners;
        });
        // Return unsubscribe function
        return () => {
            setListeners(prev => {
                const newListeners = new Map(prev);
                const typeListeners = newListeners.get(messageType);
                if (typeListeners) {
                    typeListeners.delete(callback);
                    if (typeListeners.size === 0) {
                        newListeners.delete(messageType);
                    }
                }
                return newListeners;
            });
        };
    }, []);
    // Auto-connect on mount
    (0, react_1.useEffect)(() => {
        connect();
        return () => {
            disconnect();
        };
    }, []); // Empty dependency to only run on mount/unmount
    return {
        ...state,
        connect,
        disconnect,
        send,
        subscribe,
    };
}
// Specialized hooks for common update types
function useRunUpdates(runId) {
    const ws = useWebSocketUpdates();
    const [runs, setRuns] = (0, react_1.useState)({});
    (0, react_1.useEffect)(() => {
        const unsubscribe = ws.subscribe('run_update', data => {
            if (!runId || data.runId === runId) {
                setRuns(prev => ({
                    ...prev,
                    [data.runId]: { ...prev[data.runId], ...data },
                }));
            }
        });
        return unsubscribe;
    }, [ws, runId]);
    return {
        runs: runId ? runs[runId] : runs,
        isConnected: ws.isConnected,
    };
}
function useApprovalUpdates() {
    const ws = useWebSocketUpdates();
    const [pendingApprovals, setPendingApprovals] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const unsubscribeRequests = ws.subscribe('approval_request', data => {
            setPendingApprovals(prev => [...prev, data]);
        });
        const unsubscribeResponses = ws.subscribe('approval_response', data => {
            setPendingApprovals(prev => prev.filter(approval => !(approval.runId === data.runId && approval.stepId === data.stepId)));
        });
        return () => {
            unsubscribeRequests();
            unsubscribeResponses();
        };
    }, [ws]);
    return {
        pendingApprovals,
        isConnected: ws.isConnected,
    };
}
function useSystemAlerts() {
    const ws = useWebSocketUpdates();
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const unsubscribe = ws.subscribe('system_alert', data => {
            setAlerts(prev => [data, ...prev.slice(0, 99)]); // Keep last 100 alerts
        });
        return unsubscribe;
    }, [ws]);
    return {
        alerts,
        isConnected: ws.isConnected,
        clearAlerts: () => setAlerts([]),
    };
}
