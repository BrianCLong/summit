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
exports.SocketProvider = SocketProvider;
exports.useSocket = useSocket;
const react_1 = __importStar(require("react"));
const socket_io_client_1 = require("socket.io-client");
const SocketContext = (0, react_1.createContext)(undefined);
function SocketProvider({ children, url = 'http://localhost:4001', }) {
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [connected, setConnected] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const token = localStorage.getItem('auth_token');
        const socketInstance = (0, socket_io_client_1.io)(url, {
            auth: {
                token,
            },
            transports: ['websocket'],
        });
        socketInstance.on('connect', () => {
            console.log('Connected to WebSocket server');
            setConnected(true);
        });
        socketInstance.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            setConnected(false);
        });
        socketInstance.on('connect_error', error => {
            console.error('WebSocket connection error:', error);
            setConnected(false);
        });
        setSocket(socketInstance);
        return () => {
            socketInstance.disconnect();
        };
    }, [url]);
    const emit = (event, data) => {
        if (socket && connected) {
            socket.emit(event, data);
        }
    };
    const on = (event, callback) => {
        if (socket) {
            socket.on(event, callback);
        }
    };
    const off = (event, callback) => {
        if (socket) {
            if (callback) {
                socket.off(event, callback);
            }
            else {
                socket.off(event);
            }
        }
    };
    const value = {
        socket,
        connected,
        emit,
        on,
        off,
    };
    return (<SocketContext.Provider value={value}>{children}</SocketContext.Provider>);
}
function useSocket() {
    const context = (0, react_1.useContext)(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
