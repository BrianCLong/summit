"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCollaborativeWorkspace = useCollaborativeWorkspace;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const crdt_1 = require("../lib/crdt");
// Use a known environment variable for WS URL or default
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
function useCollaborativeWorkspace(roomId, userId, username) {
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [cursors, setCursors] = (0, react_1.useState)(new Map());
    // CRDTs - using refs to maintain state across renders without causing re-renders themselves until we explicitly sync
    // However, for React to update, we need state. We'll use refs for the CRDT instances and state for their values.
    const annotationsRef = (0, react_1.useRef)(new crdt_1.ORSet(userId));
    const filterRef = (0, react_1.useRef)(new crdt_1.LWWRegister(userId, {}));
    const [annotations, setAnnotations] = (0, react_1.useState)(new Set());
    const [filter, setFilter] = (0, react_1.useState)({});
    // Initialize socket
    (0, react_1.useEffect)(() => {
        // In a real app, you might want to reuse a socket from a context
        const newSocket = (0, socket_io_client_1.io)(WS_URL, {
            transports: ['websocket'],
            auth: {
            // In a real app, token would go here
            }
        });
        newSocket.on('connect', () => {
            setIsConnected(true);
            newSocket.emit('room:join', { room: roomId });
        });
        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });
        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, [roomId]);
    // Handle incoming events
    (0, react_1.useEffect)(() => {
        if (!socket)
            return;
        const handleCursorUpdate = (data) => {
            // Don't show own cursor
            if (data.userId === userId)
                return;
            setCursors(prev => {
                const next = new Map(prev);
                next.set(data.connectionId, {
                    ...data,
                    lastUpdate: Date.now()
                });
                return next;
            });
        };
        const handleAnnotationAdd = (data) => {
            // Ideally we receive the CRDT op or the full object.
            // For simplicity, we assume we receive the annotation object and add it to our CRDT.
            // In a full CRDT sync, we'd exchange state vectors.
            // Here we trust the broadcast event.
            annotationsRef.current.add(data.annotation);
            setAnnotations(annotationsRef.current.value);
        };
        const handleAnnotationRemove = (data) => {
            // Find the annotation object by ID (CRDT set stores objects)
            // This is a limitation of this simple Set CRDT, we need the object reference.
            // We'll iterate to find it.
            const set = annotationsRef.current.value;
            let target;
            for (const item of set) {
                if (item.id === data.annotationId) {
                    target = item;
                    break;
                }
            }
            if (target) {
                annotationsRef.current.remove(target);
                setAnnotations(annotationsRef.current.value);
            }
        };
        const handleFilterUpdate = (data) => {
            filterRef.current.set(data.filter);
            setFilter(filterRef.current.value);
        };
        socket.on('collaboration:cursor_update', handleCursorUpdate);
        socket.on('collaboration:annotation_add', handleAnnotationAdd);
        socket.on('collaboration:annotation_remove', handleAnnotationRemove);
        socket.on('collaboration:filter_update', handleFilterUpdate);
        return () => {
            socket.off('collaboration:cursor_update', handleCursorUpdate);
            socket.off('collaboration:annotation_add', handleAnnotationAdd);
            socket.off('collaboration:annotation_remove', handleAnnotationRemove);
            socket.off('collaboration:filter_update', handleFilterUpdate);
        };
    }, [socket, userId]);
    // Actions
    const sendCursorMove = (0, react_1.useCallback)((x, y) => {
        if (socket && isConnected) {
            socket.emit('collaboration:cursor_move', { room: roomId, x, y, username });
        }
    }, [socket, isConnected, roomId, username]);
    const addAnnotation = (0, react_1.useCallback)((annotation) => {
        annotationsRef.current.add(annotation);
        setAnnotations(annotationsRef.current.value);
        if (socket && isConnected) {
            socket.emit('collaboration:annotation_add', { room: roomId, annotation });
        }
    }, [socket, isConnected, roomId]);
    const removeAnnotation = (0, react_1.useCallback)((annotationId) => {
        const set = annotationsRef.current.value;
        let target;
        for (const item of set) {
            if (item.id === annotationId) {
                target = item;
                break;
            }
        }
        if (target) {
            annotationsRef.current.remove(target);
            setAnnotations(annotationsRef.current.value);
            if (socket && isConnected) {
                socket.emit('collaboration:annotation_remove', { room: roomId, annotationId });
            }
        }
    }, [socket, isConnected, roomId]);
    const updateFilter = (0, react_1.useCallback)((newFilter) => {
        filterRef.current.set(newFilter);
        setFilter(filterRef.current.value);
        if (socket && isConnected) {
            socket.emit('collaboration:filter_update', { room: roomId, filter: newFilter });
        }
    }, [socket, isConnected, roomId]);
    return {
        isConnected,
        cursors,
        annotations,
        filter,
        sendCursorMove,
        addAnnotation,
        removeAnnotation,
        updateFilter
    };
}
