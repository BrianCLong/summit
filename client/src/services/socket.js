import { io } from 'socket.io-client';

let socket = null;
const OP_BATCH_WINDOW = 50; // ms
let pendingOps = [];
let flushTimer = null;
let seq = 0;

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

    console.log('WebSocket connected', socket.id);
  });
  socket.on('disconnect', (reason) => {

    console.log('WebSocket disconnected', reason);
  });
  socket.on('connect_error', (err) => {

    console.warn('WebSocket connection error:', err?.message || err);
  });
  socket.on('op:ack', (ack) => {

    console.debug('ack', ack);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function scheduleFlush() {
  if (flushTimer || pendingOps.length === 0) return;
  flushTimer = setTimeout(() => {
    if (socket && pendingOps.length) {
      socket.emit('collab:batch', pendingOps);
      pendingOps = [];
    }
    flushTimer = null;
  }, OP_BATCH_WINDOW);
}

export function sendCollabEvent(event, payload) {
  seq += 1;
  const op = {
    event,
    payload,
    opId: `${Date.now()}-${seq}`,
    seq,
    sentAt: Date.now(),
  };
  pendingOps.push(op);
  scheduleFlush();
  return op.opId;
}
