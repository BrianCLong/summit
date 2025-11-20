/**
 * Salesforce connector - integrates with Salesforce REST API
 */

import { BaseConnector } from '../core/BaseConnector';
import { ConnectorCapabilities, DataSourceConfig } from '../types';
import { Logger } from 'winston';
import axios, { AxiosInstance } from 'axios';

export class SalesforceConnector extends BaseConnector {
  private client: AxiosInstance | null = null;
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private apiVersion: string = 'v58.0';

  constructor(config: DataSourceConfig, logger: Logger) {
    super(config, logger);
    this.validateConfig();
  }

  async connect(): Promise<void> {
    try {
      // Authenticate with Salesforce
      await this.authenticate();

      // Initialize API client
      this.client = axios.create({
        baseURL: `${this.instanceUrl}/services/data/${this.apiVersion}`,
        timeout: this.config.connectionConfig.timeout || 30000,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      this.isConnected = true;
      this.logger.info(`Connected to Salesforce instance: ${this.instanceUrl}`);
    } catch (error) {
      this.logger.error('Failed to connect to Salesforce', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.accessToken = null;
    this.instanceUrl = null;
    this.isConnected = false;
    this.logger.info('Disconnected from Salesforce');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client!.get('/limits');
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
      supportsCDC: true, // Via Salesforce Platform Events
      supportsSchema: true,
      supportsPartitioning: true,
      maxConcurrentConnections: 10
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Salesforce');
    }

    const sobjectType = this.config.metadata.sobjectType || 'Contact';
    const query = this.config.extractionConfig.query || this.buildSOQLQuery(sobjectType);

    this.logger.info(`Extracting data from Salesforce object: ${sobjectType}`);

    try {
      let nextRecordsUrl: string | null = null;
      let totalRecords = 0;

      // Execute SOQL query
      const response = await this.client.get('/query', {
        params: { q: query }
      });

      let data = response.data;

      while (data.records && data.records.length > 0) {
        totalRecords += data.records.length;
        this.emitProgress(totalRecords, 0);

        yield data.records;

        // Check for more records
        if (data.nextRecordsUrl) {
          await this.rateLimit();
          const nextResponse = await this.client.get(data.nextRecordsUrl);
          data = nextResponse.data;
        } else {
          break;
        }
      }

      this.logger.info(`Extracted ${totalRecords} records from Salesforce`);
    } catch (error) {
      this.logger.error('Error extracting data from Salesforce', { error });
      throw error;
    }
  }

  async getSchema(): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Salesforce');
    }

    const sobjectType = this.config.metadata.sobjectType || 'Contact';

    try {
      const response = await this.client.get(`/sobjects/${sobjectType}/describe`);
      const describe = response.data;

      return {
        sobjectType,
        label: describe.label,
        fields: describe.fields.map((field: any) => ({
          name: field.name,
          type: field.type,
          label: field.label,
          length: field.length,
          required: !field.nillable,
          unique: field.unique,
          externalId: field.externalId,
          picklistValues: field.picklistValues
        }))
      };
    } catch (error) {
      this.logger.error('Error getting schema from Salesforce', { error });
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    const { oauth } = this.config.connectionConfig;

    if (!oauth) {
      throw new Error('OAuth configuration is required for Salesforce');
    }

    try {
      const tokenResponse = await axios.post(oauth.tokenUrl, null, {
        params: {
          grant_type: 'refresh_token',
          client_id: oauth.clientId,
          client_secret: oauth.clientSecret,
          refresh_token: oauth.refreshToken
        }
      });

      this.accessToken = tokenResponse.data.access_token;
      this.instanceUrl = tokenResponse.data.instance_url;

      this.logger.info('Salesforce authentication successful');
    } catch (error) {
      this.logger.error('Salesforce authentication failed', { error });
      throw error;
    }
  }

  private buildSOQLQuery(sobjectType: string): string {
    const { incrementalColumn, lastExtractedValue, filterConfig } = this.config.extractionConfig;

    let query = `SELECT FIELDS(ALL) FROM ${sobjectType}`;
    const conditions: string[] = [];

    // Add incremental filter
    if (incrementalColumn && lastExtractedValue !== undefined) {
      conditions.push(`${incrementalColumn} > ${lastExtractedValue}`);
    }

    // Add custom filters
    if (filterConfig?.whereClause) {
      conditions.push(filterConfig.whereClause);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY for incremental extraction
    if (incrementalColumn) {
      query += ` ORDER BY ${incrementalColumn}`;
    }

    // Salesforce limits results to 2000 per query by default
    query += ' LIMIT 2000';

    return query;
  }
}
