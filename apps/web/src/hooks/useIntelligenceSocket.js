"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIntelligenceSocket = useIntelligenceSocket;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
function useIntelligenceSocket(targetId = 'global') {
    const [items, setItems] = (0, react_1.useState)([]);
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const socketRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        // Reset state when target changes
        setItems([]);
        setAlerts([]);
        // Initialize socket connection
        const socket = (0, socket_io_client_1.io)('/realtime', {
            path: '/socket.io', // Ensure this matches server config if needed, default is /socket.io
            transports: ['websocket'],
        });
        socketRef.current = socket;
        socket.on('connect', () => {
            console.log('Connected to Intelligence Realtime Stream');
            setIsConnected(true);
            socket.emit('intelligence:subscribe', { targetId });
        });
        socket.on('disconnect', () => {
            console.log('Disconnected from Intelligence Realtime Stream');
            setIsConnected(false);
        });
        socket.on('intelligence:item', (item) => {
            setItems((prev) => [item, ...prev].slice(0, 100)); // Keep last 100 items
        });
        socket.on('intelligence:alert', (alert) => {
            setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
        });
        return () => {
            socket.emit('intelligence:unsubscribe', { targetId });
            socket.disconnect();
        };
    }, [targetId]);
    const clearItems = (0, react_1.useCallback)(() => setItems([]), []);
    const clearAlerts = (0, react_1.useCallback)(() => setAlerts([]), []);
    return {
        items,
        alerts,
        isConnected,
        clearItems,
        clearAlerts,
    };
}
