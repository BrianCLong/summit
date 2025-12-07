
import { BaseConnector } from '../base';
import { ConnectorConfig, ConnectorSchema } from '../types';
import { Readable } from 'stream';
import axios from 'axios';

export class MISPConnector extends BaseConnector {
  private url: string;
  private apiKey: string;

  constructor(config: ConnectorConfig) {
    super(config);
    this.url = config.config.url;
    this.apiKey = config.config.apiKey; // In real world, use secrets manager
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
     try {
         await axios.get(`${this.url}/events/index`, {
             headers: { 'Authorization': this.apiKey, 'Accept': 'application/json' }
         });
         return true;
     } catch {
         return false;
     }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
      return {
          fields: [
              { name: 'id', type: 'string', nullable: false },
              { name: 'info', type: 'string', nullable: false },
              { name: 'Attribute', type: 'array', nullable: true },
              { name: 'Object', type: 'array', nullable: true }
          ]
      };
  }

  async readStream(options?: any): Promise<Readable> {
      const stream = new Readable({ objectMode: true, read() {} });

      setImmediate(async () => {
          try {
              // Fetch events
              const response = await axios.post(`${this.url}/events/restSearch`,
                { returnFormat: 'json', limit: 100 },
                { headers: { 'Authorization': this.apiKey, 'Accept': 'application/json' } }
              );

              const responseData = response.data;
              const events = responseData.response || responseData;

              if (Array.isArray(events)) {
                  for (const event of events) {
                      stream.push(this.wrapEvent(event));
                      this.metrics.recordsProcessed++;
                  }
              }

              stream.push(null);
          } catch (err) {
              stream.destroy(err as Error);
              this.metrics.errors++;
          }
      });
      return stream;
  }
}
