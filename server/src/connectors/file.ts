import { BaseSourceConnector } from './base.js';
import { ConnectorContext } from './types.js';
import fs from 'fs/promises';
import path from 'path';

export interface FileConnectorConfig {
  path: string;
  pattern?: string;
  format: 'json' | 'csv' | 'text';
}

export class FileSourceConnector extends BaseSourceConnector {
  constructor(private config: FileConnectorConfig) {
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
      // Simplistic implementation: assumes path is a directory
      // Cursor is the filename we last processed
      const files = await fs.readdir(this.config.path);
      const sortedFiles = files.sort();

      let startIndex = 0;
      if (cursor) {
        startIndex = sortedFiles.indexOf(cursor) + 1;
      }

      if (startIndex >= sortedFiles.length) {
        return { records: [], nextCursor: cursor };
      }

      const fileToProcess = sortedFiles[startIndex];
      const filePath = path.join(this.config.path, fileToProcess);

      ctx.logger.info(`Processing file: ${fileToProcess}`);
      const content = await fs.readFile(filePath, 'utf-8');

      let records: any[] = [];
      if (this.config.format === 'json') {
        records = JSON.parse(content);
        if (!Array.isArray(records)) records = [records];
      } else if (this.config.format === 'text') {
        records = [{ content, filename: fileToProcess }];
      }

      // In a real implementation, we would stream this or handle large files better
      // For now, we process one file per batch call

      return {
        records,
        nextCursor: fileToProcess,
      };
    } catch (err) {
      this.handleError(ctx, err);
      throw err;
    }
  }
}
