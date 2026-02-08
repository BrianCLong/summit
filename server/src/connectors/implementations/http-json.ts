import { BaseConnector } from '../base.js';
import { ConnectorConfig, ConnectorSchema } from '../types.js';
import { Readable } from 'stream';
import axios from 'axios';

export class HTTPJSONConnector extends BaseConnector {
  private url: string;
  private headers: Record<string, string>;
  private method: string;

  constructor(config: ConnectorConfig) {
    super(config);
    this.url = config.config.url;
    this.headers = config.config.headers || {};
    this.method = config.config.method || 'GET';
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    this.logger.info(`Connected to HTTP source: ${this.url}`);
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
    try {
      await axios.request({
        url: this.url,
        method: 'HEAD',
        headers: this.headers,
        timeout: 5000
      });
      return true;
    } catch (err: any) {
      // Fallback to GET if HEAD fails
      try {
         await axios.request({
            url: this.url,
            method: 'GET',
            headers: this.headers,
            params: { limit: 1 },
            timeout: 5000
         });
         return true;
      } catch (e: any) {
        this.logger.error({ err }, 'Connection test failed');
        return false;
      }
    }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
    try {
      const response = await axios.request({
        url: this.url,
        method: this.method,
        headers: this.headers,
        params: { limit: 1 }
      });

      const data = response.data;
      let sample = Array.isArray(data) ? data[0] : data;

      // If the response wraps the data (e.g. { data: [...] })
      if (data.data && Array.isArray(data.data)) {
          sample = data.data[0];
      }

      if (!sample) {
          return { fields: [], version: 1 };
      }

      const fields = Object.keys(sample).map(key => ({
        name: key,
        type: typeof sample[key],
        nullable: true
      }));

      return { fields, version: 1 };
    } catch (err: any) {
      throw new Error(`Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async readStream(options?: Record<string, unknown>): Promise<Readable> {
    const stream = new Readable({ objectMode: true, read() {} });

    // In a real implementation, this should handle pagination
    // For now, we'll just fetch once and push

    setImmediate(async () => {
        try {
            const response = await axios.request({
                url: this.url,
                method: this.method,
                headers: this.headers,
                // Add pagination params here if configured
            });

            let items: unknown = response.data;
            if (this.config.config.dataPath) {
                // simple json path support
                const parts = (this.config.config.dataPath as string).split('.');
                for (const part of parts) {
                    items = (items as Record<string, unknown>)[part];
                }
            } else if ((items as Record<string, unknown>).data && Array.isArray((items as Record<string, unknown>).data)) {
                items = (items as Record<string, unknown>).data;
            }

            if (Array.isArray(items)) {
                for (const item of items) {
                    await this.throttle(); // Rate limit per batch or item
                    stream.push(this.wrapEvent(item));
                    this.metrics.recordsProcessed++;
                }
            } else {
                 stream.push(this.wrapEvent(items));
                 this.metrics.recordsProcessed++;
            }

            stream.push(null);
        } catch (err: any) {
            stream.destroy(err as Error);
            this.metrics.errors++;
        }
    });

    return stream;
  }

  async writeRecords(_records: any[]): Promise<void> {
    throw new Error('HTTPJSONConnector is read-only and does not support write operations');
  }
}
