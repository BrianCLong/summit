import { BaseConnector } from '../base.js';
import { ConnectorConfig, ConnectorSchema } from '../types.js';
import { Readable } from 'stream';
import axios from 'axios';

export class RSSConnector extends BaseConnector {
  private url: string;

  constructor(config: ConnectorConfig) {
    super(config);
    this.url = config.config.url;
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
      try {
          await axios.get(this.url);
          return true;
      } catch {
          return false;
      }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
      return {
          fields: [
              { name: 'title', type: 'string', nullable: false },
              { name: 'link', type: 'string', nullable: false },
              { name: 'pubDate', type: 'string', nullable: true },
              { name: 'content', type: 'string', nullable: true },
              { name: 'guid', type: 'string', nullable: true }
          ],
          version: 1
      };
  }

  async readStream(options?: Record<string, unknown>): Promise<Readable> {
      const stream = new Readable({ objectMode: true, read() {} });
      // In real implementation, use rss-parser
      // const Parser = require('rss-parser');
      // const parser = new Parser();

      setImmediate(async () => {
          try {
              // const feed = await parser.parseURL(this.url);
              // Mock for now or raw fetch
              const response = await axios.get(this.url);
              // Naive regex parsing for demo if no parser avail, or just wrap raw XML

              stream.push(this.wrapEvent({ raw: response.data }));
              this.metrics.recordsProcessed++;
              stream.push(null);
          } catch (err: any) {
              stream.destroy(err as Error);
              this.metrics.errors++;
          }
      });

      return stream;
  }

  async writeRecords(_records: any[]): Promise<void> {
    throw new Error('RSSConnector is read-only and does not support write operations');
  }
}
