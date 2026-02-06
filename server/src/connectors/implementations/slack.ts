import { BaseConnector } from '../base.js';
import { ConnectorConfig, ConnectorSchema } from '../types.js';
import { Readable } from 'stream';
import axios from 'axios';

export class SlackConnector extends BaseConnector {
  private token: string;
  private channelId: string;

  constructor(config: ConnectorConfig) {
    super(config);
    this.token = config.config.token;
    this.channelId = config.config.channelId;
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
      try {
          await axios.post('https://slack.com/api/auth.test', {}, {
              headers: { Authorization: `Bearer ${this.token}` }
          });
          return true;
      } catch {
          return false;
      }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
      return {
          fields: [
              { name: 'type', type: 'string', nullable: false },
              { name: 'ts', type: 'string', nullable: false },
              { name: 'user', type: 'string', nullable: true },
              { name: 'text', type: 'string', nullable: true }
          ],
          version: 1
      };
  }

  async readStream(options?: Record<string, unknown>): Promise<Readable> {
      const stream = new Readable({ objectMode: true, read() {} });

      setImmediate(async () => {
          try {
              const response = await axios.post('https://slack.com/api/conversations.history',
                { channel: this.channelId, limit: 100 },
                { headers: { Authorization: `Bearer ${this.token}` } }
              );

              if (response.data.ok && response.data.messages) {
                  for (const msg of response.data.messages) {
                      stream.push(this.wrapEvent(msg));
                      this.metrics.recordsProcessed++;
                  }
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
    // Slack could support sending messages, but not implemented yet
    throw new Error('SlackConnector write support not yet implemented');
  }
}
