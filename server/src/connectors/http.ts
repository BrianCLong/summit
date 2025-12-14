import { BaseSourceConnector } from './base.js';
import { ConnectorContext } from './types.js';
import axios from 'axios';

export interface HttpConnectorConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  pagination?: {
    type: 'cursor' | 'offset' | 'page';
    cursorParam?: string;
    limitParam?: string;
    outputCursorPath?: string; // dotted path to cursor in response
  };
}

export class HttpSourceConnector extends BaseSourceConnector {
  constructor(private config: HttpConnectorConfig) {
    super();
  }

  async fetchBatch(
    ctx: ConnectorContext,
    cursor?: string | null,
  ): Promise<{
    records: any[];
    nextCursor?: string | null;
  }> {
    try {
      const params: Record<string, any> = {};
      if (this.config.pagination) {
        if (cursor && this.config.pagination.cursorParam) {
          params[this.config.pagination.cursorParam] = cursor;
        }
      }

      const response = await axios({
        method: this.config.method || 'GET',
        url: this.config.url,
        headers: this.config.headers,
        params,
      });

      const data = response.data;
      let records = [];
      if (Array.isArray(data)) {
        records = data;
      } else if (data.items && Array.isArray(data.items)) {
        records = data.items;
      } else {
        records = [data];
      }

      let nextCursor = null;
      if (this.config.pagination?.outputCursorPath) {
        // Simple dot notation access
        nextCursor = this.config.pagination.outputCursorPath
          .split('.')
          .reduce((o, i) => o?.[i], data);
      }

      return {
        records,
        nextCursor: nextCursor || null,
      };
    } catch (err) {
      this.handleError(ctx, err);
      throw err;
    }
  }
}
