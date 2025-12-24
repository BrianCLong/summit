// @ts-nocheck
import { BaseConnector } from '../base.js';
import { ConnectorConfig, ConnectorSchema } from '../types.js';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

// Mocking S3 for sandbox safety (local file system simulation)
// In a real env, this would use AWS SDK
export class CSVConnector extends BaseConnector {
  private filePath: string;
  private isS3: boolean;

  constructor(config: ConnectorConfig) {
    super(config);
    this.filePath = config.config.path;
    this.isS3 = config.config.path.startsWith('s3://');
  }

  async connect(): Promise<void> {
    if (this.isS3) {
        // In this sandbox, we can't access real S3.
        // We will assume a local mount or mock.
        this.logger.info(`Simulating S3 connection to ${this.filePath}`);
    } else {
        if (!fs.existsSync(this.filePath)) {
            // It might be a relative path for testing
            if (fs.existsSync(path.join(process.cwd(), this.filePath))) {
                this.filePath = path.join(process.cwd(), this.filePath);
            }
        }
    }
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async testConnection(): Promise<boolean> {
     if (this.isS3) return true; // Mock success for S3
     try {
         await fs.promises.access(this.filePath, fs.constants.R_OK);
         return true;
     } catch {
         return false;
     }
  }

  async fetchSchema(): Promise<ConnectorSchema> {
    return new Promise((resolve, reject) => {
        const stream = this.isS3
             ? this.mockS3Stream() // Replace with real S3 stream
             : fs.createReadStream(this.filePath);

        const parser = stream.pipe(parse({
            delimiter: ',',
            columns: true,
            to: 1 // Read only first row
        }));

        let fields: { name: string; type: string; nullable: boolean }[] = [];

        parser.on('data', (row: Record<string, unknown>) => {
            fields = Object.keys(row).map(key => ({
                name: key,
                type: 'string', // CSV is always string initially
                nullable: true
            }));
        });

        parser.on('end', () => {
            resolve({ fields, version: 1 });
        });

        parser.on('error', (err: Error) => {
            reject(err);
        });
    });
  }

  async readStream(options?: Record<string, unknown>): Promise<Readable> {
    const rawStream = this.isS3
         ? this.mockS3Stream()
         : fs.createReadStream(this.filePath);

    const parser = rawStream.pipe(parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true
    }));

    const outputStream = new Readable({ objectMode: true, read() {} });

    parser.on('data', (record: Record<string, unknown>) => {
        outputStream.push(this.wrapEvent(record));
        this.metrics.recordsProcessed++;
    });

    parser.on('end', () => {
        outputStream.push(null);
    });

    parser.on('error', (err: Error) => {
        outputStream.destroy(err);
        this.metrics.errors++;
    });

    return outputStream;
  }

  private mockS3Stream(): Readable {
      const s = new Readable();
      s.push('id,name,email\n1,John Doe,john@example.com\n2,Jane Doe,jane@example.com');
      s.push(null);
      return s;
  }
}
