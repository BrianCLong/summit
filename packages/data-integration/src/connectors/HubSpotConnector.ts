/**
 * HubSpot connector - integrates with HubSpot API
 */

import { BaseConnector } from '../core/BaseConnector';
import { ConnectorCapabilities, DataSourceConfig } from '../types';
import { Logger } from 'winston';
import axios, { AxiosInstance } from 'axios';

export class HubSpotConnector extends BaseConnector {
  private client: AxiosInstance | null = null;

  constructor(config: DataSourceConfig, logger: Logger) {
    super(config, logger);
    this.validateConfig();
  }

  async connect(): Promise<void> {
    try {
      const apiKey = this.config.connectionConfig.apiKey;

      if (!apiKey) {
        throw new Error('API key is required for HubSpot');
      }

      this.client = axios.create({
        baseURL: 'https://api.hubapi.com',
        timeout: this.config.connectionConfig.timeout || 30000,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      this.isConnected = true;
      this.logger.info('Connected to HubSpot API');
    } catch (error) {
      this.logger.error('Failed to connect to HubSpot', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.isConnected = false;
    this.logger.info('Disconnected from HubSpot');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client!.get('/crm/v3/objects/contacts', {
        params: { limit: 1 }
      });
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
      supportsPartitioning: true,
      maxConcurrentConnections: 10
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to HubSpot');
    }

    const objectType = this.config.metadata.objectType || 'contacts';
    const endpoint = `/crm/v3/objects/${objectType}`;

    this.logger.info(`Extracting data from HubSpot object: ${objectType}`);

    try {
      let after: string | undefined = undefined;
      let totalRecords = 0;
      const limit = this.config.extractionConfig.batchSize || 100;

      while (true) {
        await this.rateLimit();

        const params: any = {
          limit,
          properties: this.config.metadata.properties || undefined,
          associations: this.config.metadata.associations || undefined
        };

        if (after) {
          params.after = after;
        }

        // Add incremental filter
        if (this.config.extractionConfig.incrementalColumn && this.config.extractionConfig.lastExtractedValue) {
          params[this.config.extractionConfig.incrementalColumn] = {
            gt: this.config.extractionConfig.lastExtractedValue
          };
        }

        const response = await this.client.get(endpoint, { params });

        const results = response.data.results || [];

        if (results.length === 0) {
          break;
        }

        totalRecords += results.length;
        this.emitProgress(totalRecords, 0);

        yield results;

        // Check for more pages
        if (response.data.paging?.next?.after) {
          after = response.data.paging.next.after;
        } else {
          break;
        }
      }

      this.logger.info(`Extracted ${totalRecords} records from HubSpot`);
    } catch (error) {
      this.logger.error('Error extracting data from HubSpot', { error });
      throw error;
    }
  }

  async getSchema(): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to HubSpot');
    }

    const objectType = this.config.metadata.objectType || 'contacts';

    try {
      const response = await this.client.get(`/crm/v3/schemas/${objectType}`);
      const schema = response.data;

      return {
        objectType,
        name: schema.name,
        properties: schema.properties.map((prop: any) => ({
          name: prop.name,
          label: prop.label,
          type: prop.type,
          fieldType: prop.fieldType,
          required: prop.required,
          description: prop.description
        })),
        associations: schema.associations || []
      };
    } catch (error) {
      this.logger.error('Error getting schema from HubSpot', { error });
      throw error;
    }
  }

  /**
   * Get available object types
   */
  async getObjectTypes(): Promise<string[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to HubSpot');
    }

    try {
      const response = await this.client.get('/crm/v3/schemas');
      return response.data.results.map((schema: any) => schema.objectTypeId);
    } catch (error) {
      this.logger.error('Error getting object types from HubSpot', { error });
      throw error;
    }
  }
}
