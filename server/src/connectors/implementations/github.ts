import { BaseConnector } from '../base.js';
import { ConnectorConfig, ConnectorSchema } from '../types.js';
import { Readable } from 'stream';
import axios from 'axios';

export class GitHubConnector extends BaseConnector {
  private repo: string;
  private token: string;

  constructor(config: ConnectorConfig) {
    super(config);
    this.repo = config.config.repo; // owner/repo
    this.token = config.config.token;
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
      try {
          await axios.get(`https://api.github.com/repos/${this.repo}`, {
              headers: { Authorization: `token ${this.token}`, 'User-Agent': 'IntelGraph' }
          });
          return true;
      } catch {
          return false;
      }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
      return {
          fields: [
              { name: 'id', type: 'number', nullable: false },
              { name: 'type', type: 'string', nullable: false }, // issue, pr, commit
              { name: 'title', type: 'string', nullable: true },
              { name: 'body', type: 'string', nullable: true },
              { name: 'user', type: 'json', nullable: false },
              { name: 'created_at', type: 'string', nullable: false }
          ],
          version: 1
      };
  }

  async readStream(options?: Record<string, unknown>): Promise<Readable> {
      const stream = new Readable({ objectMode: true, read() {} });

      setImmediate(async () => {
          try {
              // Fetch issues for example
              const response = await axios.get(`https://api.github.com/repos/${this.repo}/issues`, {
                  headers: { Authorization: `token ${this.token}`, 'User-Agent': 'IntelGraph' },
                  params: { state: 'all', per_page: 100 }
              });

              for (const item of response.data) {
                  stream.push(this.wrapEvent({ ...item, type: 'issue' }));
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
    throw new Error('GitHubConnector is read-only and does not support write operations');
  }
}
