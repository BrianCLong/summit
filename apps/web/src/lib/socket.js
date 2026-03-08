"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocket = exports.useSocketStore = void 0;
const socket_io_client_1 = require("socket.io-client");
const zustand_1 = require("zustand");
// Socket store for global access
exports.useSocketStore = (0, zustand_1.create)((set, get) => ({
    socket: null,
    isConnected: false,
    error: null,
    connect: (token, url) => {
        const { socket } = get();
        if (socket?.connected)
            return;
        const socketUrl = url || import.meta.env.VITE_WS_URL || 'http://localhost:3001';
        const newSocket = (0, socket_io_client_1.io)(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        newSocket.on('connect', () => {
            console.log('Socket connected');
            set({ isConnected: true, error: null });
        });
        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            set({ isConnected: false });
        });
        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            set({ error: err.message });
        });
        set({ socket: newSocket });
    },
    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false });
        }
    },
}));
// Helper to get socket instance
const getSocket = () => exports.useSocketStore.getState().socket;
exports.getSocket = getSocket;
