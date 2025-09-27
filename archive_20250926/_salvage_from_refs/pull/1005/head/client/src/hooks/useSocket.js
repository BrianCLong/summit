import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (namespace = '/', options = {}) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new socket connection
    const newSocket = io(`http://localhost:4000${namespace}`, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
      ...options
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
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [namespace]);

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
    off
  };
};

export default useSocket;

