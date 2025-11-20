/**
 * Jira connector - integrates with Atlassian Jira REST API
 */

import { BaseConnector } from '../core/BaseConnector';
import { ConnectorCapabilities, DataSourceConfig } from '../types';
import { Logger } from 'winston';
import axios, { AxiosInstance } from 'axios';

export class JiraConnector extends BaseConnector {
  private client: AxiosInstance | null = null;

  constructor(config: DataSourceConfig, logger: Logger) {
    super(config, logger);
    this.validateConfig();
  }

  async connect(): Promise<void> {
    try {
      const { host, username, apiKey } = this.config.connectionConfig;

      if (!host || !username || !apiKey) {
        throw new Error('Host, username, and API token are required for Jira');
      }

      // Create base64 encoded auth token
      const authToken = Buffer.from(`${username}:${apiKey}`).toString('base64');

      this.client = axios.create({
        baseURL: `${host}/rest/api/3`,
        timeout: this.config.connectionConfig.timeout || 30000,
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      this.isConnected = true;
      this.logger.info(`Connected to Jira instance: ${host}`);
    } catch (error) {
      this.logger.error('Failed to connect to Jira', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.isConnected = false;
    this.logger.info('Disconnected from Jira');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client!.get('/myself');
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
      maxConcurrentConnections: 5
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Jira');
    }

    const resourceType = this.config.metadata.resourceType || 'issues';

    this.logger.info(`Extracting data from Jira resource: ${resourceType}`);

    switch (resourceType) {
      case 'issues':
        yield* this.extractIssues();
        break;
      case 'projects':
        yield* this.extractProjects();
        break;
      case 'users':
        yield* this.extractUsers();
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  private async *extractIssues(): AsyncGenerator<any[], void, unknown> {
    const jql = this.config.extractionConfig.query || this.buildJQL();
    const maxResults = this.config.extractionConfig.batchSize || 100;

    let startAt = 0;
    let totalRecords = 0;

    while (true) {
      await this.rateLimit();

      const response = await this.client!.get('/search', {
        params: {
          jql,
          startAt,
          maxResults,
          fields: this.config.metadata.fields || '*all',
          expand: this.config.metadata.expand || undefined
        }
      });

      const issues = response.data.issues || [];

      if (issues.length === 0) {
        break;
      }

      totalRecords += issues.length;
      this.emitProgress(totalRecords, 0);

      yield issues;

      startAt += maxResults;

      // Check if we've retrieved all issues
      if (startAt >= response.data.total) {
        break;
      }
    }

    this.logger.info(`Extracted ${totalRecords} issues from Jira`);
  }

  private async *extractProjects(): AsyncGenerator<any[], void, unknown> {
    await this.rateLimit();

    const response = await this.client!.get('/project/search', {
      params: {
        maxResults: 100,
        expand: 'description,lead,url'
      }
    });

    const projects = response.data.values || [];

    if (projects.length > 0) {
      this.emitProgress(projects.length, 0);
      yield projects;
    }

    this.logger.info(`Extracted ${projects.length} projects from Jira`);
  }

  private async *extractUsers(): AsyncGenerator<any[], void, unknown> {
    let startAt = 0;
    const maxResults = 100;
    let totalRecords = 0;

    while (true) {
      await this.rateLimit();

      const response = await this.client!.get('/users/search', {
        params: {
          startAt,
          maxResults
        }
      });

      const users = response.data || [];

      if (users.length === 0) {
        break;
      }

      totalRecords += users.length;
      this.emitProgress(totalRecords, 0);

      yield users;

      startAt += maxResults;

      if (users.length < maxResults) {
        break;
      }
    }

    this.logger.info(`Extracted ${totalRecords} users from Jira`);
  }

  async getSchema(): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Jira');
    }

    const resourceType = this.config.metadata.resourceType || 'issues';

    try {
      if (resourceType === 'issues') {
        const response = await this.client.get('/field');
        return {
          resourceType: 'issues',
          fields: response.data.map((field: any) => ({
            id: field.id,
            name: field.name,
            type: field.schema?.type,
            custom: field.custom,
            required: field.required
          }))
        };
      }

      return {
        resourceType,
        schema: 'dynamic'
      };
    } catch (error) {
      this.logger.error('Error getting schema from Jira', { error });
      throw error;
    }
  }

  private buildJQL(): string {
    const { incrementalColumn, lastExtractedValue, filterConfig } = this.config.extractionConfig;

    const conditions: string[] = [];

    // Add incremental filter
    if (incrementalColumn && lastExtractedValue !== undefined) {
      conditions.push(`${incrementalColumn} > "${lastExtractedValue}"`);
    }

    // Add custom JQL
    if (filterConfig?.whereClause) {
      conditions.push(filterConfig.whereClause);
    }

    // Add date range filter
    if (filterConfig?.dateRange) {
      conditions.push(
        `created >= "${filterConfig.dateRange.start.toISOString()}"`,
        `created <= "${filterConfig.dateRange.end.toISOString()}"`
      );
    }

    let jql = conditions.length > 0 ? conditions.join(' AND ') : 'ORDER BY created DESC';

    // Add ORDER BY for incremental extraction
    if (incrementalColumn && !jql.includes('ORDER BY')) {
      jql += ` ORDER BY ${incrementalColumn}`;
    }

    return jql;
  }
}
