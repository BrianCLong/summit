import { BaseConnector } from './BaseConnector';
import { SourceConnector } from './types';
import { ConnectorContext } from '../data-model/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileSourceConfig {
  path: string;
  pattern?: string;
}

export class FileConnector extends BaseConnector implements SourceConnector {
  private config: FileSourceConfig;

  constructor(config: FileSourceConfig) {
    super();
    this.config = config;
  }

  async fetchBatch(ctx: ConnectorContext, cursor?: string | null): Promise<{
    records: any[];
    nextCursor?: string | null;
  }> {
    return this.withResilience(async () => {
      // Simple implementation: Read full file if cursor is null/start, else return empty
      // In a real impl, this would support reading large files in chunks or listing directory

      if (cursor === 'DONE') {
        return { records: [], nextCursor: 'DONE' };
      }

      const filePath = this.config.path;
      // Safety check to prevent reading arbitrary files outside allowed dirs in production
      // For this task, we assume local file access is permitted for ingestion

      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
           // Directory listing logic could go here
           return { records: [], nextCursor: 'DONE' };
        }

        const content = await fs.readFile(filePath, 'utf-8');
        let records: any[] = [];

        if (filePath.endsWith('.json')) {
          const parsed = JSON.parse(content);
          records = Array.isArray(parsed) ? parsed : [parsed];
        } else if (filePath.endsWith('.csv')) {
           // CSV parsing logic would go here
           // For MVP, just treating as raw text lines or similar
           records = content.split('\n').filter(line => line.trim().length > 0).map(line => ({ raw: line }));
        } else {
           records = [{ text: content, path: filePath }];
        }

        return { records, nextCursor: 'DONE' };
      } catch (err) {
        this.logger.error({ err, path: filePath }, 'Failed to read file');
        throw err;
      }
    }, ctx);
  }
}
