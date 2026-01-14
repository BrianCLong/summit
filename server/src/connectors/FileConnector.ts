import { BaseConnector } from './BaseConnector.js';
import { SourceConnector } from './base.js';
import { ConnectorContext } from '../data-model/types.js';
import { DataEnvelope } from '../types/data-envelope.js';
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

  async fetchBatch(ctx: ConnectorContext, cursor?: string | null): Promise<DataEnvelope<{
    records: any[];
    nextCursor?: string | null;
  }>> {
    return this.withResilience(async () => {
      // Simple implementation: Read full file if cursor is null/start, else return empty

      if (cursor === 'DONE') {
        return { records: [], nextCursor: 'DONE' };
      }

      const filePath = this.config.path;

      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          // Directory listing logic could go here
          return { records: [], nextCursor: 'DONE' };
        }

        // Determine if binary or text
        const ext = path.extname(filePath).toLowerCase();
        const isBinary = ['.pdf', '.png', '.jpg', '.jpeg', '.zip'].includes(ext);

        let records: any[] = [];

        if (isBinary) {
          // Read as buffer
          const buffer = await fs.readFile(filePath);
          records = [{
            path: filePath,
            content: buffer, // Raw buffer
            metadata: { size: stats.size, created: stats.birthtime }
          }];
        } else {
          // Read as text
          const content = await fs.readFile(filePath, 'utf-8');
          if (filePath.endsWith('.json')) {
            try {
              const parsed = JSON.parse(content);
              records = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e: any) {
              records = [{ text: content, path: filePath, error: 'JSON parse failed' }];
            }
          } else if (filePath.endsWith('.csv')) {
            records = content.split('\n').filter((line: string) => line.trim().length > 0).map((line: string) => ({ raw: line }));
          } else {
            records = [{ text: content, path: filePath }];
          }
        }

        return { records, nextCursor: 'DONE' };
      } catch (err: any) {
        this.logger.error({ err, path: filePath }, 'Failed to read file');
        throw err;
      }
    }, ctx);
  }
}
