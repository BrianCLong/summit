import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (namespace = '/', options = {}) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const heartbeatIntervalRef = useRef(null); // Add this ref
  const { enabled = true, baseUrl, ...socketOptions } = options;
  const optionsKey = JSON.stringify({ baseUrl: baseUrl ?? null, socketOptions });

  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
      return;
    }
    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const resolvedNamespace = namespace.startsWith('/') ? namespace : `/${namespace}`;
    const defaultOrigin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.VITE_SOCKET_BASE_URL || 'http://localhost:4000';
    const origin = (baseUrl || defaultOrigin || '').replace(/\/$/, '');
    const connectionUrl =
      resolvedNamespace === '/' ? origin || 'http://localhost:4000' : `${origin}${resolvedNamespace}`;

    // Create new socket connection
    const newSocket = io(connectionUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
      ...socketOptions,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔗 Socket connected:', newSocket.id);
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      setError(null);
    });

    newSocket.on('reconnect_error', (err) => {
      console.error('🔄❌ Socket reconnection error:', err);
      setError(err.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('🔄💥 Socket reconnection failed');
      setError('Failed to reconnect after maximum attempts');
    });

    // Development mode: handle authentication errors gracefully
    newSocket.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        console.warn('🔐 Socket authentication failed - using development mode');
        // In development, we might want to continue without authentication
        // or implement a different authentication strategy
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup function
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [namespace, enabled, optionsKey]);

  // Send heartbeat periodically
  useEffect(() => {
    if (enabled && socket && connected) {
      const interval = setInterval(() => {
        socket.emit('presence:heartbeat');
      }, 30000); // Send heartbeat every 30 seconds
      heartbeatIntervalRef.current = interval;
    } else if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, [socket, connected, enabled]);

  // Helper functions
  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('⚠️ Attempting to emit on disconnected socket:', event);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  return {
    socket,
    connected,
    error,
    emit,
    on,
    off,
  };
};

export default useSocket;
