import { BaseConnector } from '../base.js';
import { ConnectorConfig, ConnectorSchema } from '../types.js';
import { Readable } from 'stream';
import { randomUUID } from 'node:crypto';
import axios from 'axios';

// Similar to HTTP JSON but specifically for STIX 2.1 Bundles
export class STIXConnector extends BaseConnector {
  private url: string;
  private collectionId: string | undefined;

  constructor(config: ConnectorConfig) {
    super(config);
    this.url = config.config.url;
    this.collectionId = config.config.collectionId;
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
     try {
         // TAXII discovery endpoint
         await axios.get(this.url + '/taxii2/', {
            headers: { 'Accept': 'application/taxii+json;version=2.1' }
         });
         return true;
     } catch {
         // Fallback for direct STIX file
         try {
             await axios.head(this.url);
             return true;
         } catch {
             return false;
         }
     }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
      // STIX schema is fixed standard
      return {
          fields: [
              { name: 'type', type: 'string', nullable: false },
              { name: 'id', type: 'string', nullable: false },
              { name: 'spec_version', type: 'string', nullable: false },
              { name: 'objects', type: 'array', nullable: false }
          ],
          version: 1
      };
  }

  async readStream(options?: Record<string, unknown>): Promise<Readable> {
      const stream = new Readable({ objectMode: true, read() {} });

      setImmediate(async () => {
        try {
            // Assume simple bundle URL for now
            const response = await axios.get(this.url);
            const bundle = response.data;

            if ((bundle as Record<string, unknown>).objects && Array.isArray((bundle as Record<string, unknown>).objects)) {
                for (const object of (bundle as Record<string, unknown>).objects as unknown[]) {
                    stream.push(this.wrapEvent(object));
                    this.metrics.recordsProcessed++;
                }
            } else {
                // maybe it's a list of objects
                 if (Array.isArray(bundle)) {
                     for (const object of bundle) {
                         stream.push(this.wrapEvent(object));
                         this.metrics.recordsProcessed++;
                     }
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

  async writeRecords(records: any[]): Promise<void> {
      if (!this.collectionId) {
          throw new Error('STIXConnector requires a collectionId for write operations');
      }

      try {
          // Push STIX bundle to TAXII collection
          const bundle = {
              type: 'bundle',
              id: `bundle--${randomUUID()}`,
              spec_version: '2.1',
              objects: records
          };

          await axios.post(`${this.url}/collections/${this.collectionId}/objects/`,
            bundle,
            { headers: { 'Content-Type': 'application/taxii+json;version=2.1' } }
          );
          this.metrics.recordsProcessed += records.length;
      } catch (err: any) {
          this.logger.error({ err }, 'Failed to write records to TAXII');
          this.metrics.errors++;
          throw err;
      }
  }
}
