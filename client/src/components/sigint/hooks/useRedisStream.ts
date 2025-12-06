/**
 * useRedisStream - Real-time Redis Streams hook for SIGINT data
 * Provides live signal samples with automatic reconnection and buffering.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SignalSample, SignalStream, PerformanceMetrics } from '../types';

interface RedisStreamOptions {
  streamKey: string;
  bufferSize?: number;
  reconnectInterval?: number;
  maxLatency?: number;
}

interface RedisStreamState {
  samples: SignalSample[];
  isConnected: boolean;
  error: string | null;
  metrics: PerformanceMetrics;
}

const DEFAULT_BUFFER_SIZE = 2048;
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_MAX_LATENCY = 500;

export function useRedisStream(options: RedisStreamOptions): RedisStreamState & {
  streams: SignalStream[];
  subscribe: (streamId: string) => void;
  unsubscribe: (streamId: string) => void;
} {
  const {
    streamKey,
    bufferSize = DEFAULT_BUFFER_SIZE,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxLatency = DEFAULT_MAX_LATENCY,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const samplesBufferRef = useRef<SignalSample[]>([]);
  const metricsRef = useRef<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    sampleLatency: 0,
    bufferUtilization: 0,
    droppedFrames: 0,
  });
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  const [state, setState] = useState<RedisStreamState>({
    samples: [],
    isConnected: false,
    error: null,
    metrics: metricsRef.current,
  });

  const [streams, setStreams] = useState<SignalStream[]>([]);
  const subscribedStreamsRef = useRef<Set<string>>(new Set());

  // Calculate FPS and update metrics
  const updateMetrics = useCallback(() => {
    const now = performance.now();
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
  const handleSample = useCallback(
    (sample: SignalSample) => {
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
    },
    [bufferSize, maxLatency, updateMetrics]
  );

  // Handle stream updates
  const handleStreamUpdate = useCallback((stream: SignalStream) => {
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
  const subscribe = useCallback((streamId: string) => {
    if (socketRef.current && !subscribedStreamsRef.current.has(streamId)) {
      socketRef.current.emit('sigint:subscribe', { streamId });
      subscribedStreamsRef.current.add(streamId);
    }
  }, []);

  // Unsubscribe from a signal stream
  const unsubscribe = useCallback((streamId: string) => {
    if (socketRef.current && subscribedStreamsRef.current.has(streamId)) {
      socketRef.current.emit('sigint:unsubscribe', { streamId });
      subscribedStreamsRef.current.delete(streamId);
    }
  }, []);

  // Socket.IO connection lifecycle
  useEffect(() => {
    const connect = () => {
      socketRef.current = io({
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

      socketRef.current.on('error', (err: Error) => {
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
      socketRef.current.on('sigint:streams', (streamList: SignalStream[]) => {
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

export default useRedisStream;
