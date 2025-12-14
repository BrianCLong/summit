import { BaseConnector } from './BaseConnector';
import { SourceConnector } from './types';
import { ConnectorContext } from '../data-model/types';
import axios, { AxiosInstance } from 'axios';

export interface HttpSourceConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  pagination?: {
    type: 'cursor' | 'page' | 'offset';
    param: string; // e.g. 'page' or 'after'
    limitParam?: string;
    limit?: number;
  };
  extractionPath?: string; // Dot notation path to array in response
}

export class HttpConnector extends BaseConnector implements SourceConnector {
  private client: AxiosInstance;
  private config: HttpSourceConfig;

  constructor(config: HttpSourceConfig) {
    super();
    this.config = config;
    this.client = axios.create({
      baseURL: config.url,
      timeout: 10000,
      headers: config.headers,
    });
  }

  async fetchBatch(ctx: ConnectorContext, cursor?: string | null): Promise<{
    records: any[];
    nextCursor?: string | null;
  }> {
    return this.withResilience(async () => {
      const params: any = {};

      if (this.config.pagination) {
        if (cursor) {
          params[this.config.pagination.param] = cursor;
        }
        if (this.config.pagination.limitParam && this.config.pagination.limit) {
          params[this.config.pagination.limitParam] = this.config.pagination.limit;
        }
      }

      const response = await this.client.request({
        method: this.config.method || 'GET',
        data: this.config.body,
        params,
      });

      const data = response.data;
      let records: any[] = [];

      if (this.config.extractionPath) {
        // Simple extraction logic
        records = this.resolvePath(data, this.config.extractionPath);
      } else if (Array.isArray(data)) {
        records = data;
      } else {
        records = [data];
      }

      // Determine next cursor
      let nextCursor: string | null = null;
      // Heuristic: if we got fewer records than limit, we are likely done.
      // Real impl needs specific logic per API style (Link headers, next_page field, etc)
      if (this.config.pagination && records.length > 0) {
          // Placeholder for pagination logic
          // For now, assume if we got data and it's cursor based, we might need manual nextCursor logic
          // returning null to stop for simple MVP unless specified
          nextCursor = null;
      } else {
        nextCursor = null;
      }

      return { records, nextCursor };
    }, ctx);
  }

  private resolvePath(obj: any, path: string): any[] {
    return path.split('.').reduce((o, k) => (o || {})[k], obj) || [];
  }
}
