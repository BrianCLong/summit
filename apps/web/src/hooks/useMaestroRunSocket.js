"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMaestroRunSocket = useMaestroRunSocket;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
function useMaestroRunSocket({ runId, onStatus, }) {
    const [connected, setConnected] = (0, react_1.useState)(false);
    const socketRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const token = localStorage.getItem('auth_token');
        const socket = (0, socket_io_client_1.io)('/realtime', {
            path: '/socket.io',
            transports: ['websocket'],
            auth: token ? { token } : undefined,
        });
        socketRef.current = socket;
        socket.on('connect', () => {
            setConnected(true);
            if (runId) {
                socket.emit('maestro:subscribe_run', { runId });
            }
        });
        socket.on('disconnect', () => {
            setConnected(false);
        });
        socket.on('maestro:status_change', (payload) => {
            if (!runId || payload.runId !== runId)
                return;
            onStatus?.(payload);
        });
        socket.on('maestro:run_update', (payload) => {
            if (!runId || payload.runId !== runId)
                return;
            onStatus?.(payload);
        });
        return () => {
            if (runId) {
                socket.emit('maestro:unsubscribe_run', { runId });
            }
            socket.disconnect();
        };
    }, [runId, onStatus]);
    return { connected };
}
