import { createReadStream } from 'fs';
import { parse as csvParse } from 'csv-parse';
import { parseString as xmlParse } from 'xml2js';
import { promisify } from 'util';
import { BaseConnector, ConnectorMetadata } from './base.js';
import type { ConnectorConfig } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const parseXml = promisify(xmlParse);

/**
 * File Connector Configuration
 */
export interface FileConnectorConfig {
  filePath: string;
  fileType: 'CSV' | 'JSON' | 'XML';
  encoding?: BufferEncoding;
  csvOptions?: {
    delimiter?: string;
    quote?: string;
    escape?: string;
    columns?: boolean | string[];
    skipEmptyLines?: boolean;
    skipRecordsWithError?: boolean;
    trim?: boolean;
  };
  jsonOptions?: {
    arrayPath?: string; // JSONPath to array of records
    streaming?: boolean; // Stream large JSON files
  };
  xmlOptions?: {
    recordPath?: string; // XPath to record elements
    explicitArray?: boolean;
    mergeAttrs?: boolean;
  };
  batchSize?: number; // Number of records to yield at once
}

/**
 * Universal File Connector
 * Supports CSV, JSON, and XML file formats with streaming
 */
export class FileConnector extends BaseConnector {
  private fileConfig: FileConnectorConfig;

  constructor(config: ConnectorConfig) {
    super(config);
    this.fileConfig = config.config as FileConnectorConfig;
  }

  async connect(): Promise<void> {
    try {
      // Check if file exists and is readable
      await fs.access(this.fileConfig.filePath, fs.constants.R_OK);
      this.connected = true;
      this.emit('connected');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      await fs.access(this.fileConfig.filePath, fs.constants.R_OK);
      const stats = await fs.stat(this.fileConfig.filePath);
      return stats.isFile();
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    switch (this.fileConfig.fileType) {
      case 'CSV':
        yield* this.fetchCsv();
        break;
      case 'JSON':
        yield* this.fetchJson();
        break;
      case 'XML':
        yield* this.fetchXml();
        break;
      default:
        throw new Error(`Unsupported file type: ${this.fileConfig.fileType}`);
    }

    this.finish();
  }

  /**
   * Fetch data from CSV file with streaming
   */
  private async *fetchCsv(): AsyncGenerator<unknown, void, unknown> {
    const stream = createReadStream(this.fileConfig.filePath, {
      encoding: this.fileConfig.encoding || 'utf8'
    });

    const parser = stream.pipe(
      csvParse({
        delimiter: this.fileConfig.csvOptions?.delimiter || ',',
        quote: this.fileConfig.csvOptions?.quote || '"',
        escape: this.fileConfig.csvOptions?.escape || '"',
        columns: this.fileConfig.csvOptions?.columns ?? true,
        skip_empty_lines: this.fileConfig.csvOptions?.skipEmptyLines ?? true,
        skip_records_with_error: this.fileConfig.csvOptions?.skipRecordsWithError ?? false,
        trim: this.fileConfig.csvOptions?.trim ?? true
      })
    );

    try {
      for await (const record of parser) {
        yield record;
        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Fetch data from JSON file
   */
  private async *fetchJson(): AsyncGenerator<unknown, void, unknown> {
    try {
      const content = await fs.readFile(this.fileConfig.filePath, {
        encoding: this.fileConfig.encoding || 'utf8'
      });

      const data = JSON.parse(content);

      // Extract array from specified path
      let records = data;
      if (this.fileConfig.jsonOptions?.arrayPath) {
        const path = this.fileConfig.jsonOptions.arrayPath.split('.');
        for (const key of path) {
          if (records && typeof records === 'object' && key in records) {
            records = records[key];
          } else {
            throw new Error(`Invalid arrayPath: ${this.fileConfig.jsonOptions.arrayPath}`);
          }
        }
      }

      if (!Array.isArray(records)) {
        records = [records];
      }

      for (const record of records) {
        yield record;
        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Fetch data from XML file
   */
  private async *fetchXml(): AsyncGenerator<unknown, void, unknown> {
    try {
      const content = await fs.readFile(this.fileConfig.filePath, {
        encoding: this.fileConfig.encoding || 'utf8'
      });

      const result = await parseXml(content, {
        explicitArray: this.fileConfig.xmlOptions?.explicitArray ?? true,
        mergeAttrs: this.fileConfig.xmlOptions?.mergeAttrs ?? false
      });

      // Extract records from specified path
      let records = result;
      if (this.fileConfig.xmlOptions?.recordPath) {
        const path = this.fileConfig.xmlOptions.recordPath.split('.');
        for (const key of path) {
          if (records && typeof records === 'object' && key in records) {
            records = records[key];
          } else {
            throw new Error(`Invalid recordPath: ${this.fileConfig.xmlOptions.recordPath}`);
          }
        }
      }

      if (!Array.isArray(records)) {
        records = [records];
      }

      for (const record of records) {
        yield record;
        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'File Connector',
      type: `${this.fileConfig.fileType}_FILE`,
      version: '1.0.0',
      description: `Ingests data from ${this.fileConfig.fileType} files`,
      capabilities: [
        'streaming',
        'batch_processing',
        'custom_parsing'
      ],
      requiredConfig: ['filePath', 'fileType']
    };
  }
}
