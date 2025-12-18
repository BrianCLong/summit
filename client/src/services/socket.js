import { io } from 'socket.io-client';

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let manuallyClosed = false;
const OP_BATCH_WINDOW = 50; // ms
let pendingOps = [];
let flushTimer = null;
let seq = 0;

const DEFAULT_BACKOFF = {
  baseMs: 500,
  maxMs: 15000,
  factor: 2,
  jitter: true,
};

function getToken() {
  return localStorage.getItem('token');
}

export function calculateBackoffDelay(
  attempt,
  { baseMs, maxMs, factor, jitter } = DEFAULT_BACKOFF,
) {
  const rawDelay = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
  if (!jitter) return rawDelay;
  const spread = rawDelay * 0.6;
  return Math.round(rawDelay * 0.7 + Math.random() * spread);
}

function flushPendingOps() {
  if (socket && pendingOps.length) {
    socket.emit('collab:batch', pendingOps);
    pendingOps = [];
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(reason) {
  if (manuallyClosed) return;
  if (reconnectTimer) return;

  const token = getToken();
  if (!token) {
    manuallyClosed = true;
    return;
  }

  reconnectAttempts += 1;
  const delay = calculateBackoffDelay(reconnectAttempts);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!socket) {
      // Socket was cleared; recreate to ensure handlers are re-registered
      getSocket();
      return;
    }

    socket.auth = { token };
    try {
      socket.connect();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('WebSocket reconnect failed, retrying', err);
      scheduleReconnect(err);
    }
  }, delay);

  // eslint-disable-next-line no-console
  console.warn(
    `WebSocket reconnect scheduled in ${delay}ms (attempt ${reconnectAttempts})`,
    reason,
  );
}

function attachLifecycleHandlers() {
  socket.on('connect', () => {
    reconnectAttempts = 0;
    manuallyClosed = false;
    clearReconnectTimer();
    flushPendingOps();
    // eslint-disable-next-line no-console
    console.log('WebSocket connected', socket.id);
  });

  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.log('WebSocket disconnected', reason);
    scheduleReconnect(reason);
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('WebSocket connection error:', err?.message || err);
    scheduleReconnect(err);
  });

  socket.on('op:ack', (ack) => {
    // eslint-disable-next-line no-console
    console.debug('ack', ack);
  });
}

function buildSocket() {
  const token = getToken();
  if (!token) return null;

  const url = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

  socket = io(url, {
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: false,
    reconnection: false,
    withCredentials: true,
  });

  attachLifecycleHandlers();
  socket.connect();
  return socket;
}

// Create (or return existing) socket.io client with auth token
export function getSocket() {
  if (socket) return socket;
  manuallyClosed = false;
  reconnectAttempts = 0;
  clearReconnectTimer();
  return buildSocket();
}

export function disconnectSocket() {
  manuallyClosed = true;
  clearReconnectTimer();
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
