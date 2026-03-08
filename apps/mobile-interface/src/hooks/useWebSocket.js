"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketProvider = WebSocketProvider;
exports.useWebSocket = useWebSocket;
// @ts-nocheck
const react_1 = require("react");
const WebSocketContext = (0, react_1.createContext)(undefined);
function WebSocketProvider({ children }) {
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const wsRef = (0, react_1.useRef)(null);
    const subscribersRef = (0, react_1.useRef)(new Map());
    (0, react_1.useEffect)(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onerror = () => setIsConnected(false);
        ws.onmessage = (event) => {
            try {
                const { type, data } = JSON.parse(event.data);
                const callbacks = subscribersRef.current.get(type);
                if (callbacks) {
                    callbacks.forEach(cb => cb(data));
                }
            }
            catch (e) {
                console.error('WebSocket message parse error:', e);
            }
        };
        return () => {
            ws.close();
        };
    }, []);
    const send = (0, react_1.useCallback)((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);
    const subscribe = (0, react_1.useCallback)((event, callback) => {
        if (!subscribersRef.current.has(event)) {
            subscribersRef.current.set(event, new Set());
        }
        subscribersRef.current.get(event).add(callback);
        return () => {
            subscribersRef.current.get(event)?.delete(callback);
        };
    }, []);
    return (<WebSocketContext.Provider value={{ isConnected, send, subscribe }}>
      {children}
    </WebSocketContext.Provider>);
}
function useWebSocket() {
    const context = (0, react_1.useContext)(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}
