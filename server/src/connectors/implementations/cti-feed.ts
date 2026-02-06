import { BaseConnector } from '../base.js';
import { ConnectorConfig, ConnectorSchema } from '../types.js';
import { Readable } from 'stream';
import axios from 'axios';
import * as readline from 'readline';

// Generic CTI Feed (usually simple line-based text or CSV or JSON)
export class CTIFeedConnector extends BaseConnector {
  private url: string;
  private format: 'text' | 'json' | 'csv';

  constructor(config: ConnectorConfig) {
    super(config);
    this.url = config.config.url;
    this.format = config.config.format || 'text';
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
      try {
          await axios.head(this.url);
          return true;
      } catch {
          return false;
      }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
      if (this.format === 'json') {
          return { fields: [{ name: 'data', type: 'json', nullable: false }], version: 1 };
      }
      return { fields: [{ name: 'line', type: 'string', nullable: false }], version: 1 };
  }

  async readStream(options?: Record<string, unknown>): Promise<Readable> {
    const stream = new Readable({ objectMode: true, read() {} });

    setImmediate(async () => {
        try {
            const response = await axios.get(this.url, { responseType: 'stream' });

            // Just pipe raw chunks or lines
            const rl = readline.createInterface({ input: response.data });

            rl.on('line', (line: string) => {
                if (!line || line.startsWith('#')) return; // Skip comments
                stream.push(this.wrapEvent({ raw: line }));
                this.metrics.recordsProcessed++;
            });

            rl.on('close', () => {
                stream.push(null);
            });

            response.data.on('error', (err: Error) => {
                stream.destroy(err);
                this.metrics.errors++;
            });

        } catch (err: any) {
            stream.destroy(err as Error);
            this.metrics.errors++;
        }
    });

    return stream;
  }

  async writeRecords(_records: any[]): Promise<void> {
    throw new Error('CTIFeedConnector is read-only and does not support write operations');
  }
}
