"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePresenceChannel = void 0;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const throttle_1 = __importDefault(require("lodash/throttle"));
const defaultSocketUrl = () => import.meta.env.VITE_WS_URL || window.location.origin;
const usePresenceChannel = ({ workspaceId, channel, userId, userName, token, url, }) => {
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [members, setMembers] = (0, react_1.useState)(new Map());
    const pendingSelection = (0, react_1.useRef)(undefined);
    (0, react_1.useEffect)(() => {
        if (!workspaceId || !channel || !userId)
            return;
        const socketUrl = url ?? defaultSocketUrl();
        const nextSocket = (0, socket_io_client_1.io)(`${socketUrl}/collaboration`, {
            transports: ['websocket', 'polling'],
            auth: token ? { token } : undefined,
        });
        setSocket(nextSocket);
        const handleConnect = () => {
            setIsConnected(true);
            nextSocket.emit('presence:channel:join', {
                workspaceId,
                channel,
                userId,
                userName,
            });
        };
        const handleDisconnect = () => {
            setIsConnected(false);
            setMembers(new Map());
        };
        const handleSnapshot = (payload) => {
            if (payload.workspaceId !== workspaceId ||
                payload.channel !== channel) {
                return;
            }
            const next = new Map();
            payload.members.forEach(member => {
                next.set(member.userId, member);
            });
            setMembers(next);
        };
        const handleJoined = (payload) => {
            if (payload.workspaceId !== workspaceId || payload.channel !== channel) {
                return;
            }
            setMembers(prev => {
                const next = new Map(prev);
                next.set(payload.userId, payload);
                return next;
            });
        };
        const handleLeft = (payload) => {
            if (payload.workspaceId !== workspaceId || payload.channel !== channel) {
                return;
            }
            setMembers(prev => {
                const next = new Map(prev);
                next.delete(payload.userId);
                return next;
            });
        };
        const handleUpdate = (payload) => {
            if (payload.workspaceId !== workspaceId || payload.channel !== channel) {
                return;
            }
            setMembers(prev => {
                const next = new Map(prev);
                next.set(payload.userId, payload);
                return next;
            });
        };
        nextSocket.on('connect', handleConnect);
        nextSocket.on('disconnect', handleDisconnect);
        nextSocket.on('presence:channel:snapshot', handleSnapshot);
        nextSocket.on('presence:channel:joined', handleJoined);
        nextSocket.on('presence:channel:left', handleLeft);
        nextSocket.on('presence:channel:update', handleUpdate);
        return () => {
            nextSocket.emit('presence:channel:leave');
            nextSocket.off('connect', handleConnect);
            nextSocket.off('disconnect', handleDisconnect);
            nextSocket.off('presence:channel:snapshot', handleSnapshot);
            nextSocket.off('presence:channel:joined', handleJoined);
            nextSocket.off('presence:channel:left', handleLeft);
            nextSocket.off('presence:channel:update', handleUpdate);
            nextSocket.disconnect();
        };
    }, [workspaceId, channel, userId, userName, token, url]);
    const emitPresenceUpdate = (0, react_1.useMemo)(() => (0, throttle_1.default)((update) => {
        if (!socket || !isConnected)
            return;
        const selection = update.selection
            ? JSON.stringify(update.selection)
            : pendingSelection.current;
        if (selection) {
            pendingSelection.current = selection;
        }
        socket.emit('presence:channel:update', {
            workspaceId,
            channel,
            cursor: update.cursor,
            selection,
            status: update.status,
        });
    }, 80), [socket, isConnected, workspaceId, channel]);
    (0, react_1.useEffect)(() => {
        return () => {
            emitPresenceUpdate.cancel();
        };
    }, [emitPresenceUpdate]);
    const cursors = (0, react_1.useMemo)(() => Array.from(members.values())
        .filter(member => member.userId !== userId && member.cursor)
        .map(member => ({
        userId: member.userId,
        x: member.cursor.x,
        y: member.cursor.y,
        username: member.userName,
    })), [members, userId]);
    return {
        isConnected,
        members,
        cursors,
        emitPresenceUpdate,
    };
};
exports.usePresenceChannel = usePresenceChannel;
