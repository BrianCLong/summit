/**
 * CSV File Connector
 *
 * Ingests data from CSV files (local filesystem or stream).
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { PullConnector } from '../base-connector';
import type {
  ConnectorManifest,
  ConnectorConfig,
  ConnectorContext,
  ConnectorResult,
  ConnectorEntity,
} from '../types';

export interface CsvFileConnectorConfig {
  filePath: string;
  delimiter?: string;
  hasHeader?: boolean;
  encoding?: BufferEncoding;
  skipRows?: number;
  maxRows?: number;
  entityType?: string;
}

/**
 * CSV File Connector
 */
export class CsvFileConnector extends PullConnector {
  readonly manifest: ConnectorManifest = {
    id: 'csv-file-connector',
    name: 'CSV File Connector',
    version: '1.0.0',
    description: 'Ingests data from CSV files',
    status: 'stable',
    category: 'file',
    capabilities: ['pull', 'batch'],
    entityTypes: ['GenericRecord'],
    relationshipTypes: [],
    authentication: ['none'],
    requiredSecrets: [],
    license: 'MIT',
    maintainer: 'IntelGraph Team',
    documentationUrl: 'https://docs.intelgraph.io/connectors/csv-file',
    tags: ['csv', 'file', 'batch'],
    configSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        delimiter: { type: 'string', default: ',' },
        hasHeader: { type: 'boolean', default: true },
        encoding: { type: 'string', default: 'utf8' },
        skipRows: { type: 'number', default: 0 },
        maxRows: { type: 'number' },
        entityType: { type: 'string', default: 'GenericRecord' },
      },
      required: ['filePath'],
    },
  };

  private csvConfig!: CsvFileConnectorConfig;

  protected async onInitialize(config: ConnectorConfig): Promise<void> {
    this.csvConfig = config.config as CsvFileConnectorConfig;

    // Validate file path
    if (!this.csvConfig.filePath) {
      throw new Error('filePath is required');
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to open and read first few bytes
      const stream = createReadStream(this.csvConfig.filePath, {
        encoding: this.csvConfig.encoding || 'utf8',
        start: 0,
        end: 100,
      });

      return new Promise((resolve, reject) => {
        stream.on('readable', () => {
          stream.destroy();
          resolve({
            success: true,
            message: `Successfully opened CSV file: ${this.csvConfig.filePath}`,
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `Failed to open CSV file: ${(error as Error).message}`,
      };
    }
  }

  async pull(context: ConnectorContext): Promise<ConnectorResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    let entitiesProcessed = 0;
    const errors: any[] = [];

    try {
      const {
        filePath,
        delimiter = ',',
        hasHeader = true,
        encoding = 'utf8',
        skipRows = 0,
        maxRows,
        entityType = 'GenericRecord',
      } = this.csvConfig;

      context.logger.info('Starting CSV ingestion', {
        filePath,
        delimiter,
        hasHeader,
        maxRows,
      });

      const stream = createReadStream(filePath, { encoding });
      const parser = stream.pipe(
        parse({
          delimiter,
          columns: hasHeader,
          skip_records_with_error: true,
          from_line: skipRows + (hasHeader ? 1 : 0) + 1,
          to_line: maxRows ? maxRows + skipRows + (hasHeader ? 1 : 0) : undefined,
          trim: true,
          relax_quotes: true,
        })
      );

      for await (const record of parser) {
        this.checkAborted(context.signal);

        // Rate limiting
        await context.rateLimiter.acquire();

        try {
          const entity: ConnectorEntity = {
            type: entityType,
            externalId: this.generateExternalId(
              filePath,
              `row_${entitiesProcessed + 1}`
            ),
            props: record,
            confidence: 1.0,
            observedAt: new Date(),
            sourceMeta: {
              filePath,
              rowNumber: entitiesProcessed + 1,
            },
          };

          await context.emitter.emitEntity(entity);
          entitiesProcessed++;

          context.metrics.increment('csv.rows.processed', 1, {
            connector: this.manifest.id,
          });
        } catch (error) {
          context.logger.error('Error processing CSV row', error as Error, {
            rowNumber: entitiesProcessed + 1,
          });

          errors.push({
            code: 'ROW_PROCESSING_ERROR',
            message: (error as Error).message,
            recordId: `row_${entitiesProcessed + 1}`,
            retryable: false,
          });
        }
      }

      await context.emitter.flush();

      const durationMs = Date.now() - startTime;
      context.logger.info('CSV ingestion completed', {
        entitiesProcessed,
        errorCount: errors.length,
        durationMs,
      });

      context.metrics.timing('csv.ingestion.duration', durationMs, {
        connector: this.manifest.id,
      });

      return {
        success: errors.length === 0,
        entitiesProcessed,
        relationshipsProcessed: 0,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        durationMs,
        metadata: {
          filePath,
          rowsProcessed: entitiesProcessed,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      context.logger.error('CSV ingestion failed', error as Error);

      return this.failureResult(error as Error, entitiesProcessed, 0, durationMs);
    }
  }
}
