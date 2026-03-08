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
exports.useCollaboration = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = require("react");
const Y = __importStar(require("yjs"));
const y_websocket_1 = require("y-websocket");
const y_indexeddb_1 = require("y-indexeddb");
const useCollaboration = (docName, user, token) => {
    const [doc] = (0, react_1.useState)(() => new Y.Doc());
    const [provider, setProvider] = (0, react_1.useState)(null);
    const [awareness, setAwareness] = (0, react_1.useState)(null);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [isSynced, setIsSynced] = (0, react_1.useState)(false);
    // Initialize Y.js and providers
    (0, react_1.useEffect)(() => {
        if (!token)
            return; // Wait for token
        // Airgap support: IndexedDB persistence
        const indexeddbProvider = new y_indexeddb_1.IndexeddbPersistence(docName, doc);
        indexeddbProvider.on('synced', () => {
            console.log('Content loaded from local database');
        });
        // Websocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use configured WS URL or fallback to relative or default 9001
        // In dev, if UI is on 5173 and server on 4000/9001.
        // Ideally this comes from a config file.
        let wsServerUrl = import.meta.env.VITE_WS_URL;
        if (!wsServerUrl) {
            // Fallback logic
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                wsServerUrl = 'ws://localhost:9001/yjs';
            }
            else {
                wsServerUrl = `${protocol}//${window.location.host}/yjs`;
            }
        }
        const wsProvider = new y_websocket_1.WebsocketProvider(wsServerUrl, docName, doc, { connect: true, params: { token: token } });
        wsProvider.on('status', (event) => {
            setIsConnected(event.status === 'connected');
        });
        wsProvider.on('sync', (isSynced) => {
            setIsSynced(isSynced);
        });
        setProvider(wsProvider);
        setAwareness(wsProvider.awareness);
        return () => {
            wsProvider.destroy();
            indexeddbProvider.destroy();
            doc.destroy();
        };
    }, [docName, doc, token]);
    // Handle awareness/presence
    (0, react_1.useEffect)(() => {
        if (!awareness || !user.id)
            return;
        // Set local state
        awareness.setLocalState({
            user: {
                id: user.id,
                name: user.name,
                color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color for now
            }
        });
        const handleAwarenessUpdate = () => {
            const states = awareness.getStates();
            const activeUsers = [];
            states.forEach((state, clientId) => {
                if (state.user) {
                    activeUsers.push({
                        ...state.user,
                        clientId,
                    });
                }
            });
            setUsers(activeUsers);
        };
        awareness.on('change', handleAwarenessUpdate);
        handleAwarenessUpdate(); // Initial check
        return () => {
            awareness.off('change', handleAwarenessUpdate);
        };
    }, [awareness, user]);
    return {
        doc,
        provider,
        awareness,
        users,
        isConnected,
        isSynced,
    };
};
exports.useCollaboration = useCollaboration;
