// Stream resilience utilities for SSE and WebSocket connections
import React from 'react';
const DEFAULT_OPTIONS = {
  maxRetries: 10,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
  backoffMultiplier: 1.5,
  reconnectOnVisibilityChange: true,
  heartbeatInterval: 30000,
  idempotencyKey: '',
};
export class ResilientEventSource {
  constructor(url, options = {}) {
    this.eventSource = null;
    this.retryCount = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.lastEventId = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.seenEventIds = new Set();
    this.handleOpen = () => {
      console.log('EventSource connected');
      this.isConnected = true;
      this.retryCount = 0;
      this.onConnectionChange?.(true);
    };
    this.handleError = () => {
      console.log('EventSource error, attempting reconnect');
      this.isConnected = false;
      this.onConnectionChange?.(false);
      this.scheduleReconnect();
    };
    this.handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const streamEvent = {
          id: event.lastEventId,
          data,
          timestamp: Date.now(),
        };
        // Store last event ID for reconnection
        if (event.lastEventId) {
          this.lastEventId = event.lastEventId;
        }
        // Check for duplicates using event ID
        if (streamEvent.id) {
          if (this.seenEventIds.has(streamEvent.id)) {
            console.log('Duplicate event received, skipping:', streamEvent.id);
            return;
          }
          this.seenEventIds.add(streamEvent.id);
          // Limit memory usage by keeping only recent event IDs
          if (this.seenEventIds.size > 1000) {
            const firstId = this.seenEventIds.values().next().value;
            this.seenEventIds.delete(firstId);
          }
        }
        this.emit('message', streamEvent);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };
    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !this.isConnected) {
        console.log('Page became visible, reconnecting');
        this.connect();
      }
    };
    this.url = url;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    // Handle page visibility changes
    if (this.options.reconnectOnVisibilityChange) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
  connect() {
    this.disconnect();
    try {
      const urlWithLastEventId = this.buildUrlWithLastEventId();
      this.eventSource = new EventSource(urlWithLastEventId);
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);
      this.eventSource.onmessage = this.handleMessage.bind(this);
      // Set up heartbeat
      this.startHeartbeat();
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.scheduleReconnect();
    }
  }
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.clearTimers();
    this.isConnected = false;
    this.onConnectionChange?.(false);
  }
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
    // Register with EventSource if connected
    if (this.eventSource && event !== 'message') {
      this.eventSource.addEventListener(event, this.createEventHandler(event, handler));
    }
  }
  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }
  onConnectionChange(callback) {
    this.onConnectionChange = callback;
  }
  getConnectionState() {
    return {
      connected: this.isConnected,
      retryCount: this.retryCount,
      lastEventId: this.lastEventId,
      readyState: this.eventSource?.readyState ?? null,
    };
  }
  buildUrlWithLastEventId() {
    if (!this.lastEventId) return this.url;
    const separator = this.url.includes('?') ? '&' : '?';
    return `${this.url}${separator}lastEventId=${encodeURIComponent(this.lastEventId)}`;
  }
  createEventHandler(eventType, handler) {
    return (event) => {
      const streamEvent = {
        id: event.lastEventId,
        event: eventType,
        data: event.data,
        timestamp: Date.now(),
      };
      handler(streamEvent);
    };
  }
  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }
  scheduleReconnect() {
    if (this.retryCount >= this.options.maxRetries) {
      console.error('Maximum retry attempts reached');
      return;
    }
    const delay = Math.min(
      this.options.initialRetryDelay * Math.pow(this.options.backoffMultiplier, this.retryCount),
      this.options.maxRetryDelay,
    );
    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, delay);
  }
  startHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected && this.eventSource?.readyState !== EventSource.OPEN) {
        console.log('Heartbeat detected disconnection');
        this.handleError();
      }
    }, this.options.heartbeatInterval);
  }
  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearHeartbeat();
  }
  destroy() {
    this.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.eventHandlers.clear();
    this.seenEventIds.clear();
  }
}
export class ResilientWebSocket {
  constructor(url, protocols, options = {}) {
    this.ws = null;
    this.retryCount = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.pongReceived = true;
    this.isConnected = false;
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.handleOpen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.retryCount = 0;
      this.onConnectionChange?.(true);
      // Send queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.send(message);
      }
      // Start ping/pong heartbeat
      this.startPing();
    };
    this.handleClose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.isConnected = false;
      this.onConnectionChange?.(false);
      // Only reconnect if not a manual close
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
    this.handleError = () => {
      console.log('WebSocket error');
      this.isConnected = false;
      this.onConnectionChange?.(false);
    };
    this.handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle pong messages
        if (data.type === 'pong') {
          this.pongReceived = true;
          return;
        }
        this.emit('message', data);
        // Emit specific event types
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        // Emit raw data for non-JSON messages
        this.emit('message', event.data);
      }
    };
    this.url = url;
    this.protocols = protocols;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  connect() {
    this.disconnect();
    try {
      this.ws = new WebSocket(this.url, this.protocols);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.clearTimers();
    this.isConnected = false;
    this.onConnectionChange?.(false);
  }
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(data);
      return false;
    }
  }
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }
  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }
  onConnectionChange(callback) {
    this.onConnectionChange = callback;
  }
  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }
  scheduleReconnect() {
    if (this.retryCount >= this.options.maxRetries) {
      console.error('Maximum WebSocket retry attempts reached');
      return;
    }
    const delay = Math.min(
      this.options.initialRetryDelay * Math.pow(this.options.backoffMultiplier, this.retryCount),
      this.options.maxRetryDelay,
    );
    console.log(
      `WebSocket reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, delay);
  }
  startPing() {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (!this.pongReceived) {
          console.log('Pong not received, reconnecting WebSocket');
          this.ws.close(1002, 'Ping timeout');
          return;
        }
        this.pongReceived = false;
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, this.options.heartbeatInterval);
  }
  clearPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearPing();
  }
  destroy() {
    this.disconnect();
    this.eventHandlers.clear();
    this.messageQueue = [];
  }
}
// React hook for resilient streaming
export const useResilientStream = (url, options = {}) => {
  const [connection, setConnection] = React.useState(null);
  const [connected, setConnected] = React.useState(false);
  const [events, setEvents] = React.useState([]);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    const stream = new ResilientEventSource(url, options);
    stream.onConnectionChange((isConnected) => {
      setConnected(isConnected);
      setError(isConnected ? null : 'Connection lost');
    });
    stream.on('message', (event) => {
      setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
      setError(null);
    });
    stream.on('error', (event) => {
      setError(event.data?.message || 'Stream error');
    });
    stream.connect();
    setConnection(stream);
    return () => {
      stream.destroy();
    };
  }, [url]);
  return {
    connection,
    connected,
    events,
    error,
    reconnect: () => connection?.connect(),
    disconnect: () => connection?.disconnect(),
  };
};
