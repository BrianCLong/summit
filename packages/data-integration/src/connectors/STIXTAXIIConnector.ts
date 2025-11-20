/**
 * STIX/TAXII connector - integrates with threat intelligence feeds
 */

import { BaseConnector } from '../core/BaseConnector';
import { ConnectorCapabilities, DataSourceConfig } from '../types';
import { Logger } from 'winston';
import axios, { AxiosInstance } from 'axios';

export class STIXTAXIIConnector extends BaseConnector {
  private client: AxiosInstance | null = null;
  private apiRoot: string | null = null;

  constructor(config: DataSourceConfig, logger: Logger) {
    super(config, logger);
    this.validateConfig();
  }

  async connect(): Promise<void> {
    try {
      const { host, username, password } = this.config.connectionConfig;

      if (!host) {
        throw new Error('Host is required for STIX/TAXII');
      }

      const authHeaders: any = {
        'Accept': 'application/taxii+json;version=2.1',
        'Content-Type': 'application/taxii+json;version=2.1'
      };

      // Add basic auth if credentials provided
      if (username && password) {
        const authToken = Buffer.from(`${username}:${password}`).toString('base64');
        authHeaders['Authorization'] = `Basic ${authToken}`;
      }

      this.client = axios.create({
        baseURL: host,
        timeout: this.config.connectionConfig.timeout || 30000,
        headers: authHeaders
      });

      // Discover API root
      const discoveryResponse = await this.client.get('/taxii2/');
      this.apiRoot = discoveryResponse.data.api_roots?.[0] || '/taxii2/api1/';

      this.isConnected = true;
      this.logger.info(`Connected to STIX/TAXII server: ${host}`);
    } catch (error) {
      this.logger.error('Failed to connect to STIX/TAXII', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.apiRoot = null;
    this.isConnected = false;
    this.logger.info('Disconnected from STIX/TAXII');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client!.get('/taxii2/');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Connection test failed', { error });
      return false;
    }
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      supportsStreaming: false,
      supportsIncremental: true,
      supportsCDC: false,
      supportsSchema: true,
      supportsPartitioning: false,
      maxConcurrentConnections: 5
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to STIX/TAXII');
    }

    const collectionId = this.config.metadata.collectionId;

    if (!collectionId) {
      throw new Error('Collection ID is required');
    }

    this.logger.info(`Extracting STIX objects from collection: ${collectionId}`);

    try {
      let totalRecords = 0;
      const limit = this.config.extractionConfig.batchSize || 100;

      // Get collection endpoint
      const collectionEndpoint = `${this.apiRoot}collections/${collectionId}/objects/`;

      // Build query parameters
      const params: any = {
        limit
      };

      // Add incremental filter (added_after)
      if (this.config.extractionConfig.lastExtractedValue) {
        params.added_after = this.config.extractionConfig.lastExtractedValue;
      }

      // Add STIX object type filter
      if (this.config.metadata.stixType) {
        params.type = this.config.metadata.stixType;
      }

      let next: string | undefined = undefined;

      while (true) {
        await this.rateLimit();

        const requestParams = { ...params };
        if (next) {
          requestParams.next = next;
        }

        const response = await this.client.get(collectionEndpoint, { params: requestParams });

        const objects = response.data.objects || [];

        if (objects.length === 0) {
          break;
        }

        totalRecords += objects.length;
        this.emitProgress(totalRecords, 0);

        yield objects;

        // Check for more objects
        next = response.data.next;
        if (!next) {
          break;
        }
      }

      this.logger.info(`Extracted ${totalRecords} STIX objects`);
    } catch (error) {
      this.logger.error('Error extracting data from STIX/TAXII', { error });
      throw error;
    }
  }

  async getSchema(): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to STIX/TAXII');
    }

    return {
      type: 'stix',
      version: '2.1',
      objectTypes: [
        'indicator',
        'malware',
        'threat-actor',
        'attack-pattern',
        'campaign',
        'course-of-action',
        'identity',
        'intrusion-set',
        'vulnerability',
        'tool',
        'infrastructure',
        'location',
        'observed-data'
      ]
    };
  }

  /**
   * Get available collections
   */
  async getCollections(): Promise<any[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to STIX/TAXII');
    }

    try {
      const response = await this.client.get(`${this.apiRoot}collections/`);
      return response.data.collections || [];
    } catch (error) {
      this.logger.error('Error getting collections', { error });
      throw error;
    }
  }
}
