
import { BaseConnector } from '../base';
import { ConnectorConfig, ConnectorSchema } from '../types';
import { Readable } from 'stream';
import axios from 'axios';

// Specifically for OFAC SDN or similar lists
export class SanctionsListConnector extends BaseConnector {
  private url: string;

  constructor(config: ConnectorConfig) {
    super(config);
    this.url = config.config.url || 'https://www.treasury.gov/ofac/downloads/sdn.csv';
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
      return {
          fields: [
              { name: 'ent_num', type: 'string', nullable: false },
              { name: 'SDN_Name', type: 'string', nullable: false },
              { name: 'SDN_Type', type: 'string', nullable: true },
              { name: 'Program', type: 'string', nullable: true },
              { name: 'Title', type: 'string', nullable: true },
              { name: 'Call_Sign', type: 'string', nullable: true },
              { name: 'Vess_type', type: 'string', nullable: true },
              { name: 'Tonnage', type: 'string', nullable: true },
              { name: 'GRT', type: 'string', nullable: true },
              { name: 'Vess_flag', type: 'string', nullable: true },
              { name: 'Vess_owner', type: 'string', nullable: true },
              { name: 'Remarks', type: 'string', nullable: true }
          ]
      };
  }

  async readStream(options?: any): Promise<Readable> {
      const stream = new Readable({ objectMode: true, read() {} });
      const { parse } = require('csv-parse');

      setImmediate(async () => {
          try {
            const response = await axios.get(this.url, { responseType: 'stream' });
            const parser = response.data.pipe(parse({ columns: true, relax_quotes: true }));

            parser.on('data', (record: any) => {
                stream.push(this.wrapEvent(record));
                this.metrics.recordsProcessed++;
            });

            parser.on('end', () => stream.push(null));
            parser.on('error', (err: Error) => stream.destroy(err));

          } catch (err) {
              stream.destroy(err as Error);
              this.metrics.errors++;
          }
      });
      return stream;
  }
}
