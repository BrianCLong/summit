import * as promClient from 'prom-client';

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  DEGRADED = 'degraded',
  FAILED = 'failed',
}

interface QueueItem {
  payload: string;
  enqueuedAt: number;
  attempts: number;
  priority?: boolean;
}

interface ManagedConnectionContext {
  id: string;
  tenantId: string;
  userId: string;
  route?: string;
  metadata?: Record<string, string>;
}

interface ManagedConnectionOptions {
  maxQueueSize?: number;
  replayBatchSize?: number;
  queueFlushInterval?: number;
  rateLimitPerSecond?: number;
  backpressureThreshold?: number;
  heartbeatTimeout?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  backoffMultiplier?: number;
  jitter?: number;
  logger?: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;
}

const DEFAULT_OPTIONS: Required<ManagedConnectionOptions> = {
  maxQueueSize: 500,
  replayBatchSize: 50,
  queueFlushInterval: 1500,
  rateLimitPerSecond: 40,
  backpressureThreshold: 256 * 1024,
  heartbeatTimeout: 60_000,
  initialRetryDelay: 1_000,
  maxRetryDelay: 60_000,
  backoffMultiplier: 2,
  jitter: 0.3,
  logger: console,
};

interface ConnectionMetrics {
  messageCounter: promClient.Counter<string>;
  failureCounter: promClient.Counter<string>;
  backpressureCounter: promClient.Counter<string>;
  reconnectHistogram: promClient.Histogram<string>;
  stateGauge: promClient.Gauge<string>;
  queueGauge: promClient.Gauge<string>;
  queueLatencyHistogram: promClient.Histogram<string>;
}

const getOrCreateCounter = (
  name: string,
  help: string,
  labelNames: string[],
): promClient.Counter<string> => {
  const existing = promClient.register.getSingleMetric(name) as promClient.Counter<string> | undefined;
  if (existing) {
    return existing;
  }
  return new promClient.Counter({ name, help, labelNames });
};

const getOrCreateGauge = (
  name: string,
  help: string,
  labelNames: string[],
): promClient.Gauge<string> => {
  const existing = promClient.register.getSingleMetric(name) as promClient.Gauge<string> | undefined;
  if (existing) {
    return existing;
  }
  return new promClient.Gauge({ name, help, labelNames });
};

const getOrCreateHistogram = (
  name: string,
  help: string,
  labelNames: string[],
): promClient.Histogram<string> => {
  const existing = promClient.register.getSingleMetric(name) as promClient.Histogram<string> | undefined;
  if (existing) {
    return existing;
  }
  return new promClient.Histogram({ name, help, labelNames });
};

const createMetrics = (): ConnectionMetrics => ({
  messageCounter: getOrCreateCounter('websocket_messages_sent_total', 'Total WebSocket messages sent', ['tenant']),
  failureCounter: getOrCreateCounter('websocket_failures_total', 'Total WebSocket failures by reason', ['reason']),
  backpressureCounter: getOrCreateCounter('websocket_backpressure_events_total', 'Total WebSocket backpressure events', ['tenant']),
  reconnectHistogram: getOrCreateHistogram('websocket_reconnect_delay_ms', 'Reconnect delay duration in ms', ['tenant']),
  stateGauge: getOrCreateGauge('websocket_connections_state', 'Current WebSocket connections by state', ['state']),
  queueGauge: getOrCreateGauge('websocket_connection_queue_depth', 'Queued messages awaiting delivery by tenant', ['tenant']),
  queueLatencyHistogram: getOrCreateHistogram('websocket_queue_latency_ms', 'Latency between enqueue and send in ms', ['tenant']),
});

const enum TimerType {
  QUEUE_DRAIN,
}

const READY_STATE_OPEN = 1;

export class ManagedConnection {
  private readonly options: Required<ManagedConnectionOptions>;
  private readonly metrics: ConnectionMetrics;
  private ws: any;
  private state: ConnectionState = ConnectionState.CONNECTING;
  private readonly context: ManagedConnectionContext;
  private readonly queue: QueueItem[] = [];
  private reconnectAttempts = 0;
  private tokens: number;
  private lastTokenRefill = Date.now();
  private timers = new Map<TimerType, NodeJS.Timeout>();
  private lastHeartbeat = Date.now();
  private lastStateChange = Date.now();
  private failureReason: string | null = null;
  private readonly onStateChange: () => void;
  private connectStartedAt = Date.now();

  constructor(
    ws: any,
    context: ManagedConnectionContext,
    options: ManagedConnectionOptions,
    metrics: ConnectionMetrics,
    onStateChange: () => void,
  ) {
    this.ws = ws;
    this.context = context;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.metrics = metrics;
    this.tokens = this.options.rateLimitPerSecond;
    this.onStateChange = onStateChange;
  }

  getContext(): ManagedConnectionContext {
    return this.context;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getLastHeartbeat(): number {
    return this.lastHeartbeat;
  }

  getFailureReason(): string | null {
    return this.failureReason;
  }

  getReconnectDelay(): number {
    const base = Math.min(
      this.options.initialRetryDelay * Math.pow(this.options.backoffMultiplier, this.reconnectAttempts),
      this.options.maxRetryDelay,
    );
    const jitter = base * this.options.jitter;
    return base + (Math.random() * jitter - jitter / 2);
  }

  markConnected(ws?: any): void {
    if (ws) {
      this.ws = ws;
    }
    this.tokens = this.options.rateLimitPerSecond;
    this.reconnectAttempts = 0;
    this.failureReason = null;
    this.lastHeartbeat = Date.now();
    this.connectStartedAt = Date.now();
    this.transitionTo(ConnectionState.CONNECTED);
    this.flushQueue();
  }

  markReconnecting(reason: string): void {
    this.failureReason = reason;
    this.reconnectAttempts += 1;
    this.transitionTo(ConnectionState.RECONNECTING);
    this.metrics.failureCounter.labels(reason).inc();
    this.metrics.reconnectHistogram.labels(this.context.tenantId).observe(this.getReconnectDelay());
  }

  markNetworkOffline(): void {
    this.markReconnecting('network_offline');
  }

  markNetworkOnline(): void {
    this.failureReason = null;
    if (this.state === ConnectionState.RECONNECTING) {
      this.transitionTo(ConnectionState.CONNECTING);
    }
  }

  markServerRestart(reason = 'server_restart'): void {
    this.failureReason = reason;
    this.transitionTo(ConnectionState.DEGRADED);
    this.metrics.failureCounter.labels(reason).inc();
  }

  markDisconnected(reason: string): void {
    this.failureReason = reason;
    this.transitionTo(ConnectionState.DISCONNECTED);
  }

  markFailed(reason: string): void {
    this.failureReason = reason;
    this.transitionTo(ConnectionState.FAILED);
    this.metrics.failureCounter.labels(reason).inc();
  }

  updateRoute(route?: string): void {
    this.context.route = route;
  }

  updateHeartbeat(): void {
    this.lastHeartbeat = Date.now();
  }

  isHeartbeatExpired(timeout: number): boolean {
    return Date.now() - this.lastHeartbeat > timeout;
  }

  close(code = 1000, reason = 'Closed by manager'): void {
    try {
      if (typeof (this.ws as any).close === 'function') {
        (this.ws as any).close(code, reason);
      }
    } catch (error) {
      this.options.logger.warn?.(`Failed to close WebSocket ${this.context.id}: ${String(error)}`);
    }
    this.transitionTo(ConnectionState.DISCONNECTED);
    this.clearTimer(TimerType.QUEUE_DRAIN);
  }

  sendJson(payload: Record<string, unknown>): boolean {
    return this.sendRaw(JSON.stringify(payload));
  }

  sendRaw(payload: string): boolean {
    this.refillTokens();

    if (this.state !== ConnectionState.CONNECTED) {
      this.enqueue(payload);
      return false;
    }

    if (!this.consumeToken()) {
      this.enqueue(payload);
      return false;
    }

    if (!this.isReadyForSend()) {
      this.metrics.backpressureCounter.labels(this.context.tenantId).inc();
      this.enqueue(payload);
      return false;
    }

    return this.performSend(payload);
  }

  flushQueue(): number {
    if (this.state !== ConnectionState.CONNECTED || this.queue.length === 0) {
      return 0;
    }

    this.refillTokens();
    let sent = 0;
    const batchSize = Math.min(this.queue.length, this.options.replayBatchSize);
    const batch = this.queue.splice(0, batchSize);

    for (const item of batch) {
      const success = this.performSend(item.payload, item);
      if (!success) {
        this.queue.unshift(item, ...batch.slice(sent + 1));
        this.scheduleQueueDrain();
        this.metrics.queueGauge.labels(this.context.tenantId).set(this.queue.length);
        return sent;
      }
      sent += 1;
    }

    this.metrics.queueGauge.labels(this.context.tenantId).set(this.queue.length);

    if (this.queue.length > 0) {
      this.scheduleQueueDrain();
    } else {
      this.clearTimer(TimerType.QUEUE_DRAIN);
    }

    return sent;
  }

  getStats() {
    return {
      id: this.context.id,
      tenantId: this.context.tenantId,
      userId: this.context.userId,
      route: this.context.route,
      state: this.state,
      queueDepth: this.queue.length,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      failureReason: this.failureReason,
      sinceStateChangeMs: Date.now() - this.lastStateChange,
      sinceConnectedMs: Date.now() - this.connectStartedAt,
    };
  }

  destroy(): void {
    this.clearTimer(TimerType.QUEUE_DRAIN);
    this.queue.length = 0;
    this.transitionTo(ConnectionState.DISCONNECTED);
  }

  private transitionTo(next: ConnectionState): void {
    if (this.state === next) {
      return;
    }

    this.options.logger.debug?.(
      `WebSocket connection ${this.context.id} transitioning from ${this.state} to ${next}`,
    );
    this.state = next;
    this.lastStateChange = Date.now();
    this.onStateChange();
  }

  private enqueue(payload: string): void {
    const now = Date.now();
    if (this.queue.length >= this.options.maxQueueSize) {
      this.queue.shift();
      this.options.logger.warn?.(
        `Dropping oldest queued message for ${this.context.id} due to queue capacity`,
      );
    }
    this.queue.push({ payload, enqueuedAt: now, attempts: 1 });
    this.metrics.queueGauge.labels(this.context.tenantId).set(this.queue.length);
    this.scheduleQueueDrain();
  }

  private scheduleQueueDrain(): void {
    if (this.timers.has(TimerType.QUEUE_DRAIN)) {
      return;
    }
    const timer = setTimeout(() => {
      this.timers.delete(TimerType.QUEUE_DRAIN);
      this.flushQueue();
    }, this.options.queueFlushInterval);
    this.timers.set(TimerType.QUEUE_DRAIN, timer);
  }

  private clearTimer(type: TimerType): void {
    const timer = this.timers.get(type);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(type);
    }
  }

  private consumeToken(): boolean {
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
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

  private isReadyForSend(): boolean {
    if (typeof (this.ws as any).readyState === 'number' && (this.ws as any).readyState !== READY_STATE_OPEN) {
      return false;
    }

    if (typeof (this.ws as any).getBufferedAmount === 'function') {
      try {
        const buffered = (this.ws as any).getBufferedAmount();
        if (typeof buffered === 'number' && buffered > this.options.backpressureThreshold) {
          return false;
        }
      } catch (error) {
        this.options.logger.warn?.(
          `Failed to read bufferedAmount for ${this.context.id}: ${String(error)}`,
        );
      }
    }

    return true;
  }

  private performSend(payload: string, meta?: QueueItem): boolean {
    try {
      (this.ws as any).send(payload);
      this.metrics.messageCounter.labels(this.context.tenantId).inc();
      if (meta) {
        this.metrics.queueLatencyHistogram
          .labels(this.context.tenantId)
          .observe(Math.max(0, Date.now() - meta.enqueuedAt));
      }
      return true;
    } catch (error) {
      this.options.logger.error?.(
        `WebSocket send failed for ${this.context.id}: ${String(error)}`,
      );
      this.enqueue(payload);
      this.markFailed('send_error');
      return false;
    }
  }
}

export interface ConnectionPoolOptions extends ManagedConnectionOptions {}

export class WebSocketConnectionPool {
  private readonly connections = new Map<string, ManagedConnection>();
  private readonly metrics: ConnectionMetrics;
  private readonly options: ManagedConnectionOptions;

  constructor(options: ConnectionPoolOptions = {}) {
    this.options = options;
    this.metrics = createMetrics();
  }

  registerConnection(
    id: string,
    ws: any,
    context: ManagedConnectionContext,
  ): ManagedConnection {
    const existing = this.connections.get(id);
    if (existing) {
      existing.updateRoute(context.route);
      existing.markConnected(ws);
      this.refreshStateGauge();
      return existing;
    }

    const managed = new ManagedConnection(ws, context, this.options, this.metrics, () => {
      this.refreshStateGauge();
    });
    this.connections.set(id, managed);
    managed.markConnected(ws);
    this.refreshStateGauge();
    return managed;
  }

  rebindConnection(id: string, ws: any): ManagedConnection | undefined {
    const connection = this.connections.get(id);
    if (connection) {
      connection.markConnected(ws);
      this.refreshStateGauge();
    }
    return connection;
  }

  removeConnection(id: string, reason = 'closed'): void {
    const connection = this.connections.get(id);
    if (!connection) {
      return;
    }
    connection.markDisconnected(reason);
    connection.destroy();
    this.connections.delete(id);
    this.refreshStateGauge();
  }

  send(id: string, payload: string): boolean {
    const connection = this.connections.get(id);
    if (!connection) {
      return false;
    }
    return connection.sendRaw(payload);
  }

  sendJson(id: string, payload: Record<string, unknown>): boolean {
    return this.send(id, JSON.stringify(payload));
  }

  broadcast(payload: string, filter?: (conn: ManagedConnection) => boolean): void {
    for (const connection of this.connections.values()) {
      if (filter && !filter(connection)) {
        continue;
      }
      connection.sendRaw(payload);
    }
  }

  handleNetworkChange(status: 'online' | 'offline'): void {
    for (const connection of this.connections.values()) {
      if (status === 'offline') {
        connection.markNetworkOffline();
      } else {
        connection.markNetworkOnline();
      }
    }
    this.refreshStateGauge();
  }

  handleServerRestart(reason = 'server_restart'): void {
    for (const connection of this.connections.values()) {
      connection.markServerRestart(reason);
      connection.sendJson({
        type: 'server_restart',
        reason,
        timestamp: Date.now(),
      });
    }
    this.refreshStateGauge();
  }

  closeIdleConnections(timeoutMs: number): string[] {
    const closed: string[] = [];
    for (const [id, connection] of this.connections.entries()) {
      if (connection.isHeartbeatExpired(timeoutMs)) {
        connection.close(4000, 'Heartbeat timeout');
        this.connections.delete(id);
        closed.push(id);
      }
    }
    if (closed.length > 0) {
      this.refreshStateGauge();
    }
    return closed;
  }

  updateRoute(id: string, route?: string): void {
    const connection = this.connections.get(id);
    if (!connection) {
      return;
    }
    connection.updateRoute(route);
  }

  getStats() {
    const stats = [] as ReturnType<ManagedConnection['getStats']>[];
    for (const connection of this.connections.values()) {
      stats.push(connection.getStats());
    }
    return {
      totalConnections: this.connections.size,
      byState: stats.reduce<Record<ConnectionState, number>>((acc, stat) => {
        acc[stat.state] = (acc[stat.state] || 0) + 1;
        return acc;
      }, {} as Record<ConnectionState, number>),
      connections: stats,
    };
  }

  private refreshStateGauge(): void {
    const counts: Record<ConnectionState, number> = {
      [ConnectionState.CONNECTING]: 0,
      [ConnectionState.CONNECTED]: 0,
      [ConnectionState.RECONNECTING]: 0,
      [ConnectionState.DISCONNECTED]: 0,
      [ConnectionState.DEGRADED]: 0,
      [ConnectionState.FAILED]: 0,
    };

    for (const connection of this.connections.values()) {
      counts[connection.getState()] += 1;
    }

    Object.entries(counts).forEach(([state, count]) => {
      this.metrics.stateGauge.labels(state).set(count);
    });
  }
}
