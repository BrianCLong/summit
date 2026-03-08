"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCollaboration = useCollaboration;
const react_1 = require("react");
const socket_1 = require("../lib/socket");
const throttle_1 = __importDefault(require("lodash/throttle"));
function useCollaboration({ room, username, onMessage }) {
    const { socket, isConnected } = (0, socket_1.useSocketStore)();
    const [presence, setPresence] = (0, react_1.useState)([]);
    const [cursors, setCursors] = (0, react_1.useState)({});
    const [joined, setJoined] = (0, react_1.useState)(false);
    // Use ref for callback to avoid stale closures and re-subscriptions
    const onMessageRef = (0, react_1.useRef)(onMessage);
    (0, react_1.useEffect)(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);
    // Throttled cursor emitter
    // Note: Consumers should prefer emitting relative coordinates (0-1)
    // rather than absolute pixels to handle different screen sizes.
    const emitCursorMove = (0, react_1.useCallback)((0, throttle_1.default)((x, y) => {
        if (socket && isConnected && joined) {
            socket.emit('collaboration:cursor_move', { room, x, y, username });
        }
    }, 50), // 50ms throttle = 20fps
    [socket, isConnected, joined, room, username]);
    (0, react_1.useEffect)(() => {
        if (!socket || !isConnected)
            return;
        // Join room
        socket.emit('room:join', { room, metadata: { username } }, (response) => {
            if (response?.success) {
                setJoined(true);
                // Query initial presence
                socket.emit('query:presence', { room }, (res) => {
                    if (res?.presence) {
                        setPresence(res.presence);
                    }
                });
            }
        });
        // Listeners
        const handlePresenceUpdate = (data) => {
            if (data.room === room) {
                setPresence(data.presence);
                // Cleanup cursors for users who are no longer present
                const activeUserIds = new Set(data.presence.map(p => p.userId));
                setCursors(prev => {
                    const next = { ...prev };
                    let changed = false;
                    Object.keys(next).forEach(userId => {
                        if (!activeUserIds.has(userId)) {
                            delete next[userId];
                            changed = true;
                        }
                    });
                    return changed ? next : prev;
                });
            }
        };
        const handleCursorUpdate = (data) => {
            setCursors((prev) => ({
                ...prev,
                [data.userId]: {
                    userId: data.userId,
                    x: data.x,
                    y: data.y,
                    username: data.username,
                },
            }));
        };
        const handleMessage = (data) => {
            if (onMessageRef.current) {
                onMessageRef.current(data);
            }
        };
        socket.on('presence:update', handlePresenceUpdate);
        socket.on('collaboration:cursor_update', handleCursorUpdate);
        socket.on('room:message', handleMessage);
        return () => {
            socket.off('presence:update', handlePresenceUpdate);
            socket.off('collaboration:cursor_update', handleCursorUpdate);
            socket.off('room:message', handleMessage);
            socket.emit('room:leave', { room });
            setJoined(false);
        };
    }, [socket, isConnected, room, username]);
    return {
        presence,
        cursors: Object.values(cursors),
        joined,
        emitCursorMove,
    };
}
