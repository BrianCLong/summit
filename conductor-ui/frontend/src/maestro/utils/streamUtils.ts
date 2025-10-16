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

type Logger = Pick<Console, 'log' | 'error' | 'warn' | 'info' | 'debug'>;

export type WebSocketClientState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface WebSocketMetricsCollector {
  record(event: string, attributes?: Record<string, unknown>): void;
}

export interface WebSocketOptions extends StreamOptions {
  maxQueueSize?: number;
  rateLimitPerSecond?: number;
  backpressureThreshold?: number;
  queueFlushInterval?: number;
  maxReplayBatch?: number;
  jitter?: number;
  connectTimeout?: number;
  offlineReconnectDelay?: number;
  monitorInterval?: number;
  meshEndpoints?: string[];
  logger?: Logger;
  metricsCollector?: WebSocketMetricsCollector;
}

interface NormalizedWebSocketOptions extends StreamOptions {
  maxQueueSize: number;
  rateLimitPerSecond: number;
  backpressureThreshold: number;
  queueFlushInterval: number;
  maxReplayBatch: number;
  jitter: number;
  connectTimeout: number;
  offlineReconnectDelay: number;
  monitorInterval: number;
  meshEndpoints: string[];
  logger: Logger;
  metricsCollector?: WebSocketMetricsCollector;
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

const DEFAULT_WS_OPTIONS: NormalizedWebSocketOptions = {
  ...DEFAULT_OPTIONS,
  maxQueueSize: 200,
  rateLimitPerSecond: 25,
  backpressureThreshold: 256 * 1024,
  queueFlushInterval: 750,
  maxReplayBatch: 20,
  jitter: 0.3,
  connectTimeout: 15000,
  offlineReconnectDelay: 5000,
  monitorInterval: 15000,
  meshEndpoints: [],
  logger: console,
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
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
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
      this.eventSource.addEventListener(
        event,
        this.createEventHandler(event, handler),
      );
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
      readyState: this.eventSource?.readyState ?? null,
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

  private createEventHandler(
    eventType: string,
    handler: (event: StreamEvent) => void,
  ) {
    return (event: MessageEvent) => {
      const streamEvent: StreamEvent = {
        id: event.lastEventId,
        event: eventType,
        data: event.data,
        timestamp: Date.now(),
      };
      handler(streamEvent);
    };
  }

  private emit(event: string, data: StreamEvent): void {
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

  private scheduleReconnect(): void {
    if (this.retryCount >= this.options.maxRetries) {
      console.error('Maximum retry attempts reached');
      return;
    }

    const delay = Math.min(
      this.options.initialRetryDelay *
        Math.pow(this.options.backoffMultiplier, this.retryCount),
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

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (
        !this.isConnected &&
        this.eventSource?.readyState !== EventSource.OPEN
      ) {
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
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.eventHandlers.clear();
    this.seenEventIds.clear();
  }
}

interface QueuedWebSocketMessage {
  raw: any;
  serialized: string;
  enqueuedAt: number;
  attempts: number;
}

export class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private options: NormalizedWebSocketOptions;
  private retryCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private connectTimeoutTimer: NodeJS.Timeout | null = null;
  private monitorTimer: NodeJS.Timeout | null = null;
  private queueFlushTimer: NodeJS.Timeout | null = null;
  private pongReceived = true;
  private state: WebSocketClientState = 'idle';
  private messageQueue: QueuedWebSocketMessage[] = [];
  private eventHandlers = new Map<string, Set<(data: any) => void>>();
  private onConnectionChange?: (connected: boolean) => void;
  private manualClose = false;
  private tokens: number;
  private lastTokenRefill = Date.now();
  private currentEndpointIndex = 0;
  private offlineSince: number | null = null;
  private logger: Logger;
  private lastResolvedUrl: string;
  private hasVisibilityListener = false;

  constructor(
    url: string,
    protocols?: string | string[],
    options: WebSocketOptions = {},
  ) {
    this.url = url;
    this.protocols = protocols;
    const meshEndpoints =
      options.meshEndpoints && options.meshEndpoints.length > 0
        ? options.meshEndpoints
        : DEFAULT_WS_OPTIONS.meshEndpoints;
    const logger = options.logger ?? DEFAULT_WS_OPTIONS.logger;
    this.options = {
      ...DEFAULT_WS_OPTIONS,
      ...options,
      meshEndpoints,
      logger,
    };
    this.tokens = this.options.rateLimitPerSecond;
    this.logger = this.options.logger;
    this.lastResolvedUrl = this.url;
    this.setupNetworkListeners();
  }

  connect(): void {
    this.manualClose = false;
    this.clearReconnectTimer();
    const nextState: WebSocketClientState =
      this.retryCount === 0 ? 'connecting' : 'reconnecting';
    this.updateState(nextState, { attempt: this.retryCount + 1 });
    this.openSocket();
  }

  disconnect(reason = 'Manual disconnect'): void {
    this.manualClose = true;
    if (this.state !== 'disconnected') {
      this.updateState('disconnected', { reason });
    }
    this.disconnectSocketOnly(reason);
    this.clearTimers();
    this.tokens = this.options.rateLimitPerSecond;
  }

  send(data: any): boolean {
    this.refillTokens();
    const serialized = this.serializeMessage(data);
    if (
      this.state === 'connected' &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.hasCapacity()
    ) {
      const sent = this.performSend(serialized, data, false);
      if (sent) {
        return true;
      }
    }
    this.enqueue(serialized, data);
    return false;
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

  notifyNetworkChange(status: 'online' | 'offline'): void {
    if (status === 'offline') {
      this.handleNetworkOffline();
    } else {
      this.handleNetworkOnline();
    }
  }

  getSnapshot() {
    return {
      state: this.state,
      queueDepth: this.messageQueue.length,
      retryCount: this.retryCount,
      endpoint: this.lastResolvedUrl,
      offlineSince: this.offlineSince,
    };
  }

  destroy(): void {
    this.disconnect('Destroyed');
    this.removeNetworkListeners();
    this.eventHandlers.clear();
    this.messageQueue = [];
  }
  private openSocket(): void {
    this.disconnectSocketOnly();
    const targetUrl = this.resolveUrl();
    this.logger.info?.(`Opening WebSocket connection to ${targetUrl}`);
    try {
      this.ws = new WebSocket(targetUrl, this.protocols);
      this.ws.onopen = this.handleOpen;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
      this.ws.onmessage = this.handleMessage;
      this.startConnectTimeout();
    } catch (error) {
      this.logger.error?.('Failed to create WebSocket:', error);
      this.options.metricsCollector?.record('connect_error', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      this.scheduleReconnect('creation_error');
    }
  }

  private disconnectSocketOnly(reason = 'Manual disconnect'): void {
    if (this.ws) {
      try {
        this.ws.close(1000, reason);
      } catch (error) {
        this.logger.warn?.(
          `Failed to close WebSocket cleanly: ${String(error)}`,
        );
      }
      this.ws = null;
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline);
      window.addEventListener('offline', this.handleNetworkOffline);
    }
    if (
      typeof document !== 'undefined' &&
      this.options.reconnectOnVisibilityChange
    ) {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
      this.hasVisibilityListener = true;
    }
  }

  private removeNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkOnline);
      window.removeEventListener('offline', this.handleNetworkOffline);
    }
    if (typeof document !== 'undefined' && this.hasVisibilityListener) {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
      this.hasVisibilityListener = false;
    }
  }

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.visibilityState === 'visible' && this.state !== 'connected') {
      this.logger.info?.(
        'Document became visible; verifying WebSocket connectivity',
      );
      this.scheduleReconnect('visibility');
    }
  };

  private handleNetworkOnline = (): void => {
    this.offlineSince = null;
    this.options.metricsCollector?.record('browser_online', {});
    if (this.state !== 'connected') {
      this.scheduleReconnect('network_online');
    }
  };

  private handleNetworkOffline = (): void => {
    this.offlineSince = Date.now();
    this.options.metricsCollector?.record('browser_offline', {});
    if (this.state === 'connected') {
      this.connectionLoss('network_offline');
    } else {
      this.scheduleReconnect('network_offline');
    }
  };

  private handleOpen = (): void => {
    this.clearConnectTimeout();
    this.clearReconnectTimer();
    this.tokens = this.options.rateLimitPerSecond;
    this.pongReceived = true;
    this.updateState('connected', { endpoint: this.lastResolvedUrl });
    this.options.metricsCollector?.record('connected', {
      endpoint: this.lastResolvedUrl,
    });
    this.flushQueue();
    this.startPing();
    this.startMonitoring();
  };

  private handleClose = (event: CloseEvent): void => {
    this.options.metricsCollector?.record('closed', {
      code: event.code,
      reason: event.reason,
    });
    if (this.manualClose) {
      this.manualClose = false;
      this.clearTimers();
      return;
    }
    this.connectionLoss(`close_${event.code}`);
  };

  private handleError = (event: Event): void => {
    const message = (event as ErrorEvent)?.message || 'unknown';
    this.logger.warn?.(`WebSocket error encountered: ${message}`);
    this.options.metricsCollector?.record('socket_error', { message });
    this.connectionLoss('error');
  };

  private handleMessage = (event: MessageEvent): void => {
    const raw = event.data;
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data?.type === 'pong') {
        this.pongReceived = true;
        this.options.metricsCollector?.record('pong', {
          latency:
            typeof data.timestamp === 'number'
              ? Date.now() - data.timestamp
              : undefined,
        });
        return;
      }
      this.emit('message', data);
      if (data?.type) {
        this.emit(data.type, data);
      }
    } catch (error) {
      this.logger.error?.('Failed to parse WebSocket message:', error);
      this.emit('message', raw);
    }
  };

  private updateState(
    state: WebSocketClientState,
    context?: Record<string, unknown>,
  ): void {
    if (this.state === state) {
      return;
    }
    const previous = this.state;
    this.state = state;
    const isConnected = state === 'connected';
    const wasConnected = previous === 'connected';
    if (isConnected) {
      this.retryCount = 0;
    }
    if (this.onConnectionChange && isConnected !== wasConnected) {
      this.onConnectionChange(isConnected);
    }
    this.emit('state-change', {
      state,
      previous,
      timestamp: Date.now(),
      context,
    });
    this.options.metricsCollector?.record('state_change', {
      state,
      previous,
      ...context,
    });
  }
  private hasCapacity(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    if (this.tokens < 1) {
      return false;
    }
    if (this.ws.bufferedAmount > this.options.backpressureThreshold) {
      this.options.metricsCollector?.record('client_backpressure', {
        bufferedAmount: this.ws.bufferedAmount,
        threshold: this.options.backpressureThreshold,
      });
      return false;
    }
    return true;
  }

  private performSend(
    serialized: string,
    raw: any,
    fromQueue: boolean,
    enqueuedAt?: number,
  ): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    if (this.tokens < 1) {
      return false;
    }
    if (this.ws.bufferedAmount > this.options.backpressureThreshold) {
      this.options.metricsCollector?.record('client_backpressure', {
        bufferedAmount: this.ws.bufferedAmount,
        threshold: this.options.backpressureThreshold,
      });
      return false;
    }
    try {
      this.ws.send(serialized);
      this.tokens = Math.max(0, this.tokens - 1);
      this.options.metricsCollector?.record('message_sent', {
        fromQueue,
        queueDepth: this.messageQueue.length,
        endpoint: this.lastResolvedUrl,
        latency: enqueuedAt ? Date.now() - enqueuedAt : 0,
      });
      return true;
    } catch (error) {
      this.logger.error?.('Failed to send WebSocket message:', error);
      this.options.metricsCollector?.record('send_error', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return false;
    }
  }

  private enqueue(serialized: string, raw: any): void {
    if (this.messageQueue.length >= this.options.maxQueueSize) {
      this.messageQueue.shift();
      this.logger.warn?.(
        'Dropping queued WebSocket message due to queue capacity',
      );
      this.options.metricsCollector?.record('queue_dropped', {
        maxQueueSize: this.options.maxQueueSize,
      });
    }
    this.messageQueue.push({
      raw,
      serialized,
      enqueuedAt: Date.now(),
      attempts: 1,
    });
    this.options.metricsCollector?.record('message_queued', {
      queueDepth: this.messageQueue.length,
      state: this.state,
    });
    this.scheduleQueueFlush();
  }

  private scheduleQueueFlush(): void {
    if (this.queueFlushTimer || this.messageQueue.length === 0) {
      return;
    }
    this.queueFlushTimer = setTimeout(() => {
      this.queueFlushTimer = null;
      this.flushQueue();
    }, this.options.queueFlushInterval);
  }

  private flushQueue(): void {
    if (this.state !== 'connected' || !this.ws) {
      return;
    }
    this.refillTokens();
    const batch = this.messageQueue.splice(0, this.options.maxReplayBatch);
    let failureIndex = -1;
    for (let index = 0; index < batch.length; index += 1) {
      const item = batch[index];
      const success = this.performSend(
        item.serialized,
        item.raw,
        true,
        item.enqueuedAt,
      );
      if (!success) {
        item.attempts += 1;
        failureIndex = index;
        break;
      }
    }
    if (failureIndex >= 0) {
      const toRequeue = batch.slice(failureIndex);
      this.messageQueue = [...toRequeue, ...this.messageQueue];
      this.scheduleQueueFlush();
    } else if (this.messageQueue.length > 0) {
      this.scheduleQueueFlush();
    }
    this.options.metricsCollector?.record('queue_depth', {
      queueDepth: this.messageQueue.length,
    });
  }

  private computeReconnectDelay(): number {
    const base = Math.min(
      this.options.initialRetryDelay *
        Math.pow(this.options.backoffMultiplier, this.retryCount),
      this.options.maxRetryDelay,
    );
    const jitter = base * this.options.jitter;
    const delay = base + (Math.random() * jitter - jitter / 2);
    if (this.offlineSince) {
      return Math.max(delay, this.options.offlineReconnectDelay);
    }
    return delay;
  }

  private scheduleReconnect(reason: string): void {
    if (this.retryCount >= this.options.maxRetries) {
      this.updateState('failed', { reason });
      this.emit('error', {
        type: 'reconnect_failed',
        message: 'Maximum WebSocket retry attempts reached',
        reason,
      });
      this.options.metricsCollector?.record('reconnect_exhausted', { reason });
      return;
    }
    this.clearReconnectTimer();
    const delay = this.computeReconnectDelay();
    this.options.metricsCollector?.record('reconnect_scheduled', {
      reason,
      delay,
      attempt: this.retryCount + 1,
      nextEndpoint: this.getNextEndpointPreview(),
    });
    this.logger.warn?.(
      `WebSocket reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries}) due to ${reason}`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.retryCount += 1;
      if (this.options.meshEndpoints.length > 0) {
        this.currentEndpointIndex =
          (this.currentEndpointIndex + 1) % this.options.meshEndpoints.length;
      }
      this.connect();
    }, delay);
  }

  private connectionLoss(reason: string): void {
    this.clearConnectTimeout();
    this.clearPing();
    this.stopMonitoring();
    if (this.ws) {
      try {
        this.ws.close(4000, reason);
      } catch (error) {
        this.logger.warn?.(
          `Error while closing WebSocket after loss: ${String(error)}`,
        );
      }
      this.ws = null;
    }
    this.options.metricsCollector?.record('connection_lost', {
      reason,
      attempt: this.retryCount + 1,
    });
    this.updateState('reconnecting', { reason });
    this.scheduleReconnect(reason);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startConnectTimeout(): void {
    this.clearConnectTimeout();
    this.connectTimeoutTimer = setTimeout(() => {
      this.options.metricsCollector?.record('connect_timeout', {
        url: this.lastResolvedUrl,
      });
      this.logger.warn?.('WebSocket connection attempt timed out');
      this.connectionLoss('connect_timeout');
    }, this.options.connectTimeout);
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      if (!this.pongReceived) {
        this.logger.warn?.('Pong not received, forcing WebSocket reconnect');
        this.connectionLoss('heartbeat_timeout');
        return;
      }
      this.pongReceived = false;
      try {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } catch (error) {
        this.logger.error?.('Failed to send ping frame:', error);
      }
    }, this.options.heartbeatInterval);
  }

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private startMonitoring(): void {
    this.stopMonitoring();
    this.monitorTimer = setInterval(() => {
      this.options.metricsCollector?.record('connection_snapshot', {
        state: this.state,
        queueDepth: this.messageQueue.length,
        bufferedAmount: this.ws?.bufferedAmount ?? 0,
        retryCount: this.retryCount,
        endpoint: this.lastResolvedUrl,
      });
    }, this.options.monitorInterval);
  }

  private stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  private clearQueueFlush(): void {
    if (this.queueFlushTimer) {
      clearTimeout(this.queueFlushTimer);
      this.queueFlushTimer = null;
    }
  }
  private clearTimers(): void {
    this.clearReconnectTimer();
    this.clearPing();
    this.clearQueueFlush();
    this.clearConnectTimeout();
    this.stopMonitoring();
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastTokenRefill) / 1000;
    if (elapsedSeconds <= 0) {
      return;
    }
    this.tokens = Math.min(
      this.options.rateLimitPerSecond,
      this.tokens + elapsedSeconds * this.options.rateLimitPerSecond,
    );
    this.lastTokenRefill = now;
  }

  private resolveUrl(): string {
    if (!this.options.meshEndpoints.length) {
      this.lastResolvedUrl = this.url;
      return this.lastResolvedUrl;
    }
    const candidate =
      this.options.meshEndpoints[
        this.currentEndpointIndex % this.options.meshEndpoints.length
      ];
    if (!candidate) {
      this.lastResolvedUrl = this.url;
      return this.lastResolvedUrl;
    }
    if (candidate.includes('{path}')) {
      const path = this.url.replace(/^wss?:\/\//, '');
      this.lastResolvedUrl = candidate.replace('{path}', path);
      return this.lastResolvedUrl;
    }
    if (candidate.startsWith('ws://') || candidate.startsWith('wss://')) {
      this.lastResolvedUrl = candidate;
      return this.lastResolvedUrl;
    }
    try {
      const reference = new URL(this.url);
      const base = candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
      this.lastResolvedUrl = `${base}${reference.pathname}${reference.search}${reference.hash}`;
      return this.lastResolvedUrl;
    } catch (error) {
      this.lastResolvedUrl = candidate;
      return this.lastResolvedUrl;
    }
  }

  private getNextEndpointPreview(): string {
    if (!this.options.meshEndpoints.length) {
      return this.url;
    }
    const nextIndex =
      (this.currentEndpointIndex + 1) % this.options.meshEndpoints.length;
    return this.options.meshEndpoints[nextIndex] ?? this.url;
  }

  private serializeMessage(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    try {
      return JSON.stringify(data);
    } catch (error) {
      this.logger.error?.(
        'Failed to serialize WebSocket message payload:',
        error,
      );
      this.options.metricsCollector?.record('serialization_error', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return JSON.stringify({ type: 'unserializable', payload: String(error) });
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error?.('Error in WebSocket event handler:', error);
        }
      });
    }
  }
}

interface WebSocketPoolEntry {
  socket: ResilientWebSocket;
  url: string;
  protocols?: string | string[];
  options: WebSocketOptions;
}

export interface WebSocketConnectionPoolOptions {
  defaultOptions?: WebSocketOptions;
  logger?: Logger;
  metricsCollector?: WebSocketMetricsCollector;
}

export class WebSocketConnectionPool {
  private readonly connections = new Map<string, WebSocketPoolEntry>();
  private readonly defaultOptions: WebSocketOptions;
  private readonly logger: Logger;
  private readonly metricsCollector?: WebSocketMetricsCollector;

  constructor(options: WebSocketConnectionPoolOptions = {}) {
    this.defaultOptions = options.defaultOptions ?? {};
    this.logger = options.logger ?? console;
    this.metricsCollector = options.metricsCollector;
  }

  acquire(
    id: string,
    url: string,
    protocols?: string | string[],
    options: WebSocketOptions = {},
  ): ResilientWebSocket {
    const existing = this.connections.get(id);
    if (existing) {
      return existing.socket;
    }

    const mergedOptions: WebSocketOptions = {
      ...this.defaultOptions,
      ...options,
    };

    if (this.metricsCollector && !mergedOptions.metricsCollector) {
      mergedOptions.metricsCollector = this.metricsCollector;
    }

    const socket = new ResilientWebSocket(url, protocols, mergedOptions);
    socket.on('state-change', (payload) => {
      this.metricsCollector?.record('pool_state_change', {
        id,
        ...(payload as Record<string, unknown>),
      });
    });

    this.connections.set(id, {
      socket,
      url,
      protocols,
      options: mergedOptions,
    });
    return socket;
  }

  get(id: string): ResilientWebSocket | undefined {
    return this.connections.get(id)?.socket;
  }

  release(id: string): void {
    const entry = this.connections.get(id);
    if (!entry) {
      return;
    }
    entry.socket.destroy();
    this.connections.delete(id);
  }

  broadcast(data: any): void {
    for (const { socket } of this.connections.values()) {
      socket.send(data);
    }
  }

  notifyNetworkChange(status: 'online' | 'offline'): void {
    for (const { socket } of this.connections.values()) {
      socket.notifyNetworkChange(status);
    }
  }

  disconnectAll(reason = 'Pool shutdown'): void {
    for (const { socket } of this.connections.values()) {
      socket.disconnect(reason);
    }
  }

  getDiagnostics(): Record<
    string,
    ReturnType<ResilientWebSocket['getSnapshot']>
  > {
    const diagnostics: Record<
      string,
      ReturnType<ResilientWebSocket['getSnapshot']>
    > = {};
    for (const [id, { socket }] of this.connections.entries()) {
      diagnostics[id] = socket.getSnapshot();
    }
    return diagnostics;
  }
}
// React hook for resilient streaming
export const useResilientStream = (
  url: string,
  options: StreamOptions = {},
) => {
  const [connection, setConnection] =
    React.useState<ResilientEventSource | null>(null);
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
