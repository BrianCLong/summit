"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRedisStream = useRedisStream;
/**
 * useRedisStream - Real-time Redis Streams hook for SIGINT data
 * Provides live signal samples with automatic reconnection and buffering.
 */
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const DEFAULT_BUFFER_SIZE = 2048;
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_MAX_LATENCY = 500;
function useRedisStream(options) {
    const { streamKey, bufferSize = DEFAULT_BUFFER_SIZE, reconnectInterval = DEFAULT_RECONNECT_INTERVAL, maxLatency = DEFAULT_MAX_LATENCY, } = options;
    const socketRef = (0, react_1.useRef)(null);
    const samplesBufferRef = (0, react_1.useRef)([]);
    const metricsRef = (0, react_1.useRef)({
        fps: 0,
        renderTime: 0,
        sampleLatency: 0,
        bufferUtilization: 0,
        droppedFrames: 0,
    });
    const frameCountRef = (0, react_1.useRef)(0);
    const lastFrameTimeRef = (0, react_1.useRef)(Date.now());
    const [state, setState] = (0, react_1.useState)({
        samples: [],
        isConnected: false,
        error: null,
        metrics: metricsRef.current,
    });
    const [streams, setStreams] = (0, react_1.useState)([]);
    const subscribedStreamsRef = (0, react_1.useRef)(new Set());
    // Calculate FPS and update metrics
    const updateMetrics = (0, react_1.useCallback)(() => {
        const now = Date.now();
        const elapsed = now - lastFrameTimeRef.current;
        if (elapsed >= 1000) {
            metricsRef.current = {
                ...metricsRef.current,
                fps: Math.round((frameCountRef.current / elapsed) * 1000),
                bufferUtilization: samplesBufferRef.current.length / bufferSize,
            };
            frameCountRef.current = 0;
            lastFrameTimeRef.current = now;
            setState((prev) => ({
                ...prev,
                metrics: metricsRef.current,
            }));
        }
        frameCountRef.current++;
    }, [bufferSize]);
    // Handle incoming samples with ring buffer
    const handleSample = (0, react_1.useCallback)((sample) => {
        const latency = Date.now() - sample.timestamp;
        // Drop samples if latency exceeds threshold
        if (latency > maxLatency) {
            metricsRef.current.droppedFrames++;
            return;
        }
        metricsRef.current.sampleLatency = latency;
        // Ring buffer implementation
        samplesBufferRef.current.push(sample);
        if (samplesBufferRef.current.length > bufferSize) {
            samplesBufferRef.current = samplesBufferRef.current.slice(-bufferSize);
        }
        updateMetrics();
    }, [bufferSize, maxLatency, updateMetrics]);
    // Handle stream updates
    const handleStreamUpdate = (0, react_1.useCallback)((stream) => {
        setStreams((prev) => {
            const idx = prev.findIndex((s) => s.id === stream.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = stream;
                return updated;
            }
            return [...prev, stream];
        });
    }, []);
    // Subscribe to a specific signal stream
    const subscribe = (0, react_1.useCallback)((streamId) => {
        if (socketRef.current && !subscribedStreamsRef.current.has(streamId)) {
            socketRef.current.emit('sigint:subscribe', { streamId });
            subscribedStreamsRef.current.add(streamId);
        }
    }, []);
    // Unsubscribe from a signal stream
    const unsubscribe = (0, react_1.useCallback)((streamId) => {
        if (socketRef.current && subscribedStreamsRef.current.has(streamId)) {
            socketRef.current.emit('sigint:unsubscribe', { streamId });
            subscribedStreamsRef.current.delete(streamId);
        }
    }, []);
    // Socket.IO connection lifecycle
    (0, react_1.useEffect)(() => {
        const connect = () => {
            socketRef.current = (0, socket_io_client_1.io)({
                path: '/api/sigint/stream',
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: reconnectInterval,
            });
            socketRef.current.on('connect', () => {
                setState((prev) => ({
                    ...prev,
                    isConnected: true,
                    error: null,
                }));
                // Subscribe to main stream key
                socketRef.current?.emit('sigint:join', { streamKey });
                // Re-subscribe to any previously subscribed streams
                subscribedStreamsRef.current.forEach((streamId) => {
                    socketRef.current?.emit('sigint:subscribe', { streamId });
                });
            });
            socketRef.current.on('disconnect', () => {
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                }));
            });
            socketRef.current.on('error', (err) => {
                setState((prev) => ({
                    ...prev,
                    error: err.message,
                }));
            });
            // Handle real-time sample data
            socketRef.current.on('sigint:sample', handleSample);
            // Handle stream metadata updates
            socketRef.current.on('sigint:stream', handleStreamUpdate);
            // Handle bulk stream list
            socketRef.current.on('sigint:streams', (streamList) => {
                setStreams(streamList);
            });
        };
        connect();
        // Update samples state at 60fps max
        const updateInterval = setInterval(() => {
            setState((prev) => ({
                ...prev,
                samples: [...samplesBufferRef.current],
            }));
        }, 16);
        return () => {
            clearInterval(updateInterval);
            socketRef.current?.disconnect();
        };
    }, [
        streamKey,
        reconnectInterval,
        handleSample,
        handleStreamUpdate,
    ]);
    return {
        ...state,
        streams,
        subscribe,
        unsubscribe,
    };
}
exports.default = useRedisStream;
