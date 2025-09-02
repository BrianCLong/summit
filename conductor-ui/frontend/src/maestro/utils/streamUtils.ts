// Stream resilience utilities for SSE and WebSocket connections
import React from 'react';

export interface StreamOptions {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  backoffMultiplier?: number;
  reconnectOnVisibilityChange?: boolean;
  heartbeatInterval?: number;
  idempotencyKey?: string;
}

export interface StreamEvent {
  id?: string;
  event?: string;
  data: any;
  timestamp: number;
}

const DEFAULT_OPTIONS: Required<StreamOptions> = {
  maxRetries: 10,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
  backoffMultiplier: 1.5,
  reconnectOnVisibilityChange: true,
  heartbeatInterval: 30000,
  idempotencyKey: '',
};

export class ResilientEventSource {
  private eventSource: EventSource | null = null;
  private url: string;
  private options: Required<StreamOptions>;
  private retryCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastEventId: string | null = null;
  private isConnected = false;
  private eventHandlers = new Map<string, Set<(event: StreamEvent) => void>>();
  private onConnectionChange?: (connected: boolean) => void;
  private seenEventIds = new Set<string>();

  constructor(url: string, options: StreamOptions = {}) {
    this.url = url;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Handle page visibility changes
    if (this.options.reconnectOnVisibilityChange) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  connect(): void {
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

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.clearTimers();
    this.isConnected = false;
    this.onConnectionChange?.(false);
  }

  on(event: string, handler: (event: StreamEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    
    // Register with EventSource if connected
    if (this.eventSource && event !== 'message') {
      this.eventSource.addEventListener(event, this.createEventHandler(event, handler));
    }
  }

  off(event: string, handler: (event: StreamEvent) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }

  getConnectionState(): { 
    connected: boolean; 
    retryCount: number; 
    lastEventId: string | null;
    readyState: number | null;
  } {
    return {
      connected: this.isConnected,
      retryCount: this.retryCount,
      lastEventId: this.lastEventId,
      readyState: this.eventSource?.readyState ?? null
    };
  }

  private buildUrlWithLastEventId(): string {
    if (!this.lastEventId) return this.url;
    
    const separator = this.url.includes('?') ? '&' : '?';
    return `${this.url}${separator}lastEventId=${encodeURIComponent(this.lastEventId)}`;
  }

  private handleOpen = (): void => {
    console.log('EventSource connected');
    this.isConnected = true;
    this.retryCount = 0;
    this.onConnectionChange?.(true);
  };

  private handleError = (): void => {
    console.log('EventSource error, attempting reconnect');
    this.isConnected = false;
    this.onConnectionChange?.(false);
    this.scheduleReconnect();
  };

  private handleMessage = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data);
      const streamEvent: StreamEvent = {
        id: event.lastEventId,
        data,
        timestamp: Date.now()
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

  private createEventHandler(eventType: string, handler: (event: StreamEvent) => void) {
    return (event: MessageEvent) => {
      const streamEvent: StreamEvent = {
        id: event.lastEventId,
        event: eventType,
        data: event.data,
        timestamp: Date.now()
      };
      handler(streamEvent);
    };
  }

  private emit(event: string, data: StreamEvent): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= this.options.maxRetries) {
      console.error('Maximum retry attempts reached');
      return;
    }
    
    const delay = Math.min(
      this.options.initialRetryDelay * Math.pow(this.options.backoffMultiplier, this.retryCount),
      this.options.maxRetryDelay
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected && this.eventSource?.readyState !== EventSource.OPEN) {
        console.log('Heartbeat detected disconnection');
        this.handleError();
      }
    }, this.options.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearHeartbeat();
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && !this.isConnected) {
      console.log('Page became visible, reconnecting');
      this.connect();
    }
  };

  destroy(): void {
    this.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.eventHandlers.clear();
    this.seenEventIds.clear();
  }
}

export class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private options: Required<StreamOptions>;
  private retryCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongReceived = true;
  private isConnected = false;
  private messageQueue: any[] = [];
  private eventHandlers = new Map<string, Set<(data: any) => void>>();
  private onConnectionChange?: (connected: boolean) => void;

  constructor(url: string, protocols?: string | string[], options: StreamOptions = {}) {
    this.url = url;
    this.protocols = protocols;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  connect(): void {
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

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.clearTimers();
    this.isConnected = false;
    this.onConnectionChange?.(false);
  }

  send(data: any): boolean {
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

  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }

  private handleOpen = (): void => {
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

  private handleClose = (event: CloseEvent): void => {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.onConnectionChange?.(false);
    
    // Only reconnect if not a manual close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  };

  private handleError = (): void => {
    console.log('WebSocket error');
    this.isConnected = false;
    this.onConnectionChange?.(false);
  };

  private handleMessage = (event: MessageEvent): void => {
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

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= this.options.maxRetries) {
      console.error('Maximum WebSocket retry attempts reached');
      return;
    }
    
    const delay = Math.min(
      this.options.initialRetryDelay * Math.pow(this.options.backoffMultiplier, this.retryCount),
      this.options.maxRetryDelay
    );
    
    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, delay);
  }

  private startPing(): void {
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

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearPing();
  }

  destroy(): void {
    this.disconnect();
    this.eventHandlers.clear();
    this.messageQueue = [];
  }
}

// React hook for resilient streaming
export const useResilientStream = (
  url: string, 
  options: StreamOptions = {}
) => {
  const [connection, setConnection] = React.useState<ResilientEventSource | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [events, setEvents] = React.useState<StreamEvent[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stream = new ResilientEventSource(url, options);
    
    stream.onConnectionChange((isConnected) => {
      setConnected(isConnected);
      setError(isConnected ? null : 'Connection lost');
    });
    
    stream.on('message', (event) => {
      setEvents(prev => [...prev.slice(-99), event]); // Keep last 100 events
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