import { EventEmitter } from 'events';
import crypto from 'crypto';
import WebSocket from 'ws';

export interface SplunkConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  username: string;
  password: string;
  index: string;
  source: string;
  sourcetype: string;
  token?: string;
  validateSSL: boolean;
  timeout: number;
  retryAttempts: number;
  batchSize: number;
  flushInterval: number;
}

export interface SplunkEvent {
  time: number;
  host: string;
  source: string;
  sourcetype: string;
  index: string;
  event: Record<string, any>;
  fields?: Record<string, any>;
}

export interface SplunkBatch {
  id: string;
  events: SplunkEvent[];
  timestamp: number;
  checksum: string;
  metadata: {
    connector: string;
    version: string;
    tenant: string;
    source: string;
  };
}

export interface SplunkQuery {
  search: string;
  earliest_time?: string;
  latest_time?: string;
  max_count?: number;
  output_mode: 'json' | 'xml' | 'csv';
  exec_mode?: 'normal' | 'blocking' | 'oneshot';
}

export interface SplunkSearchJob {
  sid: string;
  status:
    | 'queued'
    | 'parsing'
    | 'running'
    | 'paused'
    | 'finalizing'
    | 'done'
    | 'failed';
  progress: number;
  resultCount: number;
  query: SplunkQuery;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ConnectionMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageLatency: number;
  lastHeartbeat: Date;
  connectionUptime: number;
  errorRate: number;
  throughputPerSecond: number;
}

export class SplunkConnector extends EventEmitter {
  private config: SplunkConfig;
  private isConnected: boolean = false;
  private sessionKey?: string;
  private eventQueue: SplunkEvent[] = [];
  private batchTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private ws?: WebSocket;
  private metrics: ConnectionMetrics;
  private searchJobs = new Map<string, SplunkSearchJob>();

  constructor(config: SplunkConfig) {
    super();
    this.config = config;
    this.metrics = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      averageLatency: 0,
      lastHeartbeat: new Date(),
      connectionUptime: 0,
      errorRate: 0,
      throughputPerSecond: 0,
    };
  }

  async connect(): Promise<void> {
    try {
      await this.authenticate();
      await this.establishWebSocket();
      this.startBatchProcessor();
      this.startHeartbeat();
      this.isConnected = true;

      this.emit('connected', {
        timestamp: new Date(),
        config: {
          host: this.config.host,
          port: this.config.port,
          index: this.config.index,
        },
      });
    } catch (error) {
      this.emit('error', {
        type: 'connection_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    const authUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}/services/auth/login`;

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `username=${this.config.username}&password=${this.config.password}`,
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const text = await response.text();
    const sessionKeyMatch = text.match(/<sessionKey>([^<]+)<\/sessionKey>/);

    if (!sessionKeyMatch) {
      throw new Error('Failed to extract session key from response');
    }

    this.sessionKey = sessionKeyMatch[1];
  }

  private async establishWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws${this.config.protocol === 'https' ? 's' : ''}://${this.config.host}:${this.config.port}/services/streams/events`;

      this.ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Splunk ${this.sessionKey}`,
        },
      });

      this.ws.on('open', () => {
        this.emit('websocket_connected');
        resolve();
      });

      this.ws.on('error', (error) => {
        this.emit('websocket_error', error);
        reject(error);
      });

      this.ws.on('message', (data) => {
        this.handleWebSocketMessage(data);
      });

      this.ws.on('close', () => {
        this.handleWebSocketClose();
      });
    });
  }

  private handleWebSocketMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      this.emit('message_received', {
        type: message.type,
        data: message.data,
        timestamp: new Date(),
      });
    } catch (error) {
      this.emit('parse_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data: data.toString(),
        timestamp: new Date(),
      });
    }
  }

  private handleWebSocketClose(): void {
    this.isConnected = false;
    this.emit('websocket_disconnected');
    this.attemptReconnect();
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectTimer = undefined;
      } catch (error) {
        this.emit('reconnect_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
        this.reconnectTimer = undefined;
        this.attemptReconnect();
      }
    }, 5000);
  }

  async sendEvent(
    event: Omit<
      SplunkEvent,
      'time' | 'host' | 'source' | 'sourcetype' | 'index'
    >,
  ): Promise<void> {
    const splunkEvent: SplunkEvent = {
      time: Date.now() / 1000,
      host: this.config.host,
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      index: this.config.index,
      ...event,
    };

    this.eventQueue.push(splunkEvent);
    this.metrics.totalEvents++;

    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flushEvents();
    }

    this.emit('event_queued', {
      eventId: crypto.randomUUID(),
      queueSize: this.eventQueue.length,
      timestamp: new Date(),
    });
  }

  async sendBatch(
    events: Omit<
      SplunkEvent,
      'time' | 'host' | 'source' | 'sourcetype' | 'index'
    >[],
  ): Promise<void> {
    const splunkEvents = events.map((event) => ({
      time: Date.now() / 1000,
      host: this.config.host,
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      index: this.config.index,
      ...event,
    }));

    this.eventQueue.push(...splunkEvents);
    this.metrics.totalEvents += events.length;

    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flushEvents();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch: SplunkBatch = {
      id: crypto.randomUUID(),
      events: [...this.eventQueue],
      timestamp: Date.now(),
      checksum: this.calculateBatchChecksum(this.eventQueue),
      metadata: {
        connector: 'splunk-connector',
        version: '1.0.0',
        tenant: 'intelgraph',
        source: this.config.source,
      },
    };

    this.eventQueue = [];

    try {
      const startTime = Date.now();
      await this.submitBatch(batch);
      const latency = Date.now() - startTime;

      this.metrics.successfulEvents += batch.events.length;
      this.updateMetrics(latency);

      this.emit('batch_sent', {
        batchId: batch.id,
        eventCount: batch.events.length,
        latency,
        timestamp: new Date(),
      });
    } catch (error) {
      this.metrics.failedEvents += batch.events.length;

      this.emit('batch_failed', {
        batchId: batch.id,
        eventCount: batch.events.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      this.eventQueue.unshift(...batch.events);
    }
  }

  private calculateBatchChecksum(events: SplunkEvent[]): string {
    const concatenated = events.map((e) => JSON.stringify(e)).join('');
    return crypto.createHash('sha256').update(concatenated).digest('hex');
  }

  private async submitBatch(batch: SplunkBatch): Promise<void> {
    const url = `${this.config.protocol}://${this.config.host}:${this.config.port}/services/collector/event/1.0`;

    const payload = batch.events
      .map((event) => JSON.stringify(event))
      .join('\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Splunk ${this.config.token || this.sessionKey}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    if (!response.ok) {
      throw new Error(`Failed to submit batch: ${response.statusText}`);
    }
  }

  async executeSearch(query: SplunkQuery): Promise<SplunkSearchJob> {
    const searchUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}/services/search/jobs`;

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Splunk ${this.sessionKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        search: query.search,
        earliest_time: query.earliest_time || '-24h',
        latest_time: query.latest_time || 'now',
        max_count: query.max_count?.toString() || '100',
        output_mode: query.output_mode || 'json',
        exec_mode: query.exec_mode || 'normal',
      }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const text = await response.text();
    const sidMatch = text.match(/<sid>([^<]+)<\/sid>/);

    if (!sidMatch) {
      throw new Error('Failed to extract search job ID');
    }

    const job: SplunkSearchJob = {
      sid: sidMatch[1],
      status: 'queued',
      progress: 0,
      resultCount: 0,
      query,
      createdAt: new Date(),
    };

    this.searchJobs.set(job.sid, job);
    this.monitorSearchJob(job.sid);

    return job;
  }

  private async monitorSearchJob(sid: string): Promise<void> {
    const checkInterval = setInterval(async () => {
      try {
        const job = this.searchJobs.get(sid);
        if (!job) {
          clearInterval(checkInterval);
          return;
        }

        const statusUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}/services/search/jobs/${sid}`;

        const response = await fetch(statusUrl, {
          headers: {
            Authorization: `Splunk ${this.sessionKey}`,
          },
        });

        if (response.ok) {
          const statusXml = await response.text();

          const statusMatch = statusXml.match(
            /<s:key name="dispatchState">([^<]+)<\/s:key>/,
          );
          const progressMatch = statusXml.match(
            /<s:key name="doneProgress">([^<]+)<\/s:key>/,
          );
          const resultCountMatch = statusXml.match(
            /<s:key name="resultCount">([^<]+)<\/s:key>/,
          );

          if (statusMatch) {
            job.status = statusMatch[1] as SplunkSearchJob['status'];
          }
          if (progressMatch) {
            job.progress = parseFloat(progressMatch[1]);
          }
          if (resultCountMatch) {
            job.resultCount = parseInt(resultCountMatch[1]);
          }

          this.emit('search_progress', {
            sid: job.sid,
            status: job.status,
            progress: job.progress,
            resultCount: job.resultCount,
          });

          if (job.status === 'done' || job.status === 'failed') {
            job.completedAt = new Date();
            clearInterval(checkInterval);

            this.emit('search_completed', {
              sid: job.sid,
              status: job.status,
              resultCount: job.resultCount,
              duration: job.completedAt.getTime() - job.createdAt.getTime(),
            });
          }
        }
      } catch (error) {
        this.emit('search_monitor_error', {
          sid,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 2000);
  }

  async getSearchResults(
    sid: string,
    offset: number = 0,
    count: number = 100,
  ): Promise<any[]> {
    const resultsUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}/services/search/jobs/${sid}/results`;

    const response = await fetch(resultsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Splunk ${this.sessionKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get search results: ${response.statusText}`);
    }

    const results = await response.json();
    return results.results || [];
  }

  private startBatchProcessor(): void {
    this.batchTimer = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents();
      }
    }, this.config.flushInterval);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.metrics.lastHeartbeat = new Date();

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }

      this.emit('heartbeat', {
        timestamp: this.metrics.lastHeartbeat,
        metrics: this.getMetrics(),
      });
    }, 30000);
  }

  private updateMetrics(latency: number): void {
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
    this.metrics.errorRate =
      this.metrics.failedEvents / this.metrics.totalEvents;
    this.metrics.throughputPerSecond =
      this.metrics.successfulEvents / (Date.now() / 1000);
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  getSearchJob(sid: string): SplunkSearchJob | undefined {
    return this.searchJobs.get(sid);
  }

  listSearchJobs(): SplunkSearchJob[] {
    return Array.from(this.searchJobs.values());
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.eventQueue.length > 0) {
      await this.flushEvents();
    }

    if (this.ws) {
      this.ws.close();
    }

    this.emit('disconnected', {
      timestamp: new Date(),
      finalMetrics: this.getMetrics(),
    });
  }
}
