/**
 * @intelgraph/stream-ingestion
 * Multi-protocol data ingestion
 */

import { EventEmitter } from 'events';
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import type { StreamProducer } from '@intelgraph/stream-processing';

export interface CollectorConfig {
  name: string;
  type: 'http' | 'websocket' | 'mqtt' | 'grpc' | 'file' | 'database';
  port?: number;
  path?: string;
  topic: string;
  batchSize?: number;
  flushInterval?: number;
}

/**
 * HTTP Collector
 * Ingest data via HTTP POST requests
 */
export class HttpCollector extends EventEmitter {
  private config: CollectorConfig;
  private producer?: StreamProducer;
  private server: any;
  private buffer: any[] = [];

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
  }

  async start(producer: StreamProducer): Promise<void> {
    this.producer = producer;

    this.server = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'POST' && req.url === (this.config.path || '/ingest')) {
        this.handleRequest(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server.listen(this.config.port || 8080);
    console.log(`HTTP collector started on port ${this.config.port || 8080}`);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        if (this.producer) {
          await this.producer.send({
            topic: this.config.topic,
            value: JSON.stringify(data),
            timestamp: Date.now(),
          });
        }

        this.emit('data:ingested', data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
    }
  }
}

/**
 * WebSocket Collector
 * Ingest real-time data via WebSocket connections
 */
export class WebSocketCollector extends EventEmitter {
  private config: CollectorConfig;
  private producer?: StreamProducer;
  private wss?: WebSocketServer;

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
  }

  async start(producer: StreamProducer): Promise<void> {
    this.producer = producer;

    this.wss = new WebSocketServer({ port: this.config.port || 8081 });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');

      ws.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          if (this.producer) {
            await this.producer.send({
              topic: this.config.topic,
              value: JSON.stringify(data),
              timestamp: Date.now(),
            });
          }

          this.emit('data:ingested', data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });

    console.log(`WebSocket collector started on port ${this.config.port || 8081}`);
  }

  async stop(): Promise<void> {
    if (this.wss) {
      this.wss.close();
    }
  }
}

/**
 * File Collector
 * Ingest data from files (log files, CSV, JSON, etc.)
 */
export class FileCollector extends EventEmitter {
  private config: CollectorConfig;
  private producer?: StreamProducer;
  private isRunning = false;

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
  }

  async start(producer: StreamProducer): Promise<void> {
    this.producer = producer;
    this.isRunning = true;
    console.log(`File collector started for ${this.config.path}`);

    // In a real implementation, this would:
    // - Watch file system for new files
    // - Tail log files
    // - Parse different formats
    // - Handle file rotation
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }
}

/**
 * Database CDC Collector
 * Capture database change data
 */
export class CDCCollector extends EventEmitter {
  private config: CollectorConfig;
  private producer?: StreamProducer;

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
  }

  async start(producer: StreamProducer): Promise<void> {
    this.producer = producer;
    console.log('CDC collector started');

    // In a real implementation, this would:
    // - Connect to database
    // - Listen for changes (INSERT, UPDATE, DELETE)
    // - Stream changes to message bus
  }

  async stop(): Promise<void> {
    // Cleanup
  }
}

/**
 * Collector Manager
 * Manages multiple collectors
 */
export class CollectorManager extends EventEmitter {
  private collectors: Map<string, any> = new Map();

  registerCollector(collector: any): void {
    this.collectors.set(collector.config.name, collector);
  }

  async startAll(producer: StreamProducer): Promise<void> {
    for (const collector of this.collectors.values()) {
      await collector.start(producer);
    }
    console.log(`Started ${this.collectors.size} collectors`);
  }

  async stopAll(): Promise<void> {
    for (const collector of this.collectors.values()) {
      await collector.stop();
    }
  }
}
