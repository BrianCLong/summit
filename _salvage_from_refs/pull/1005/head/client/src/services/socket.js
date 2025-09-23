import { io } from 'socket.io-client';

let socket = null;

// Create (or return existing) socket.io client with auth token
export function getSocket() {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  if (!token) {
    // No token available; do not create a socket
    return null;
  }

  const url = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

  socket = io(url, {
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    withCredentials: true,
  });

  // Basic connection logging (optional)
  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('WebSocket connected', socket.id);
  });
  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.log('WebSocket disconnected', reason);
  });
  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('WebSocket connection error:', err?.message || err);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

