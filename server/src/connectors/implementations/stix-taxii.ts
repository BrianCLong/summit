
import { BaseConnector } from '../base';
import { ConnectorConfig, ConnectorSchema } from '../types';
import { Readable } from 'stream';
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
          ]
      };
  }

  async readStream(options?: any): Promise<Readable> {
      const stream = new Readable({ objectMode: true, read() {} });

      setImmediate(async () => {
        try {
            // Assume simple bundle URL for now
            const response = await axios.get(this.url);
            const bundle = response.data;

            if (bundle.objects && Array.isArray(bundle.objects)) {
                for (const object of bundle.objects) {
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
        } catch (err) {
            stream.destroy(err as Error);
            this.metrics.errors++;
        }
      });
      return stream;
  }
}
