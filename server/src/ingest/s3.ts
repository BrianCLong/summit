import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { ingestQueue } from './http.js';
import { Counter } from 'prom-client';

const s3IngestBytes = new Counter({
  name: 'ingest_s3_bytes_total',
  help: 'Total bytes ingested from S3/CSV',
});

// Simulate S3 client interface for Day-0 local ingest
interface S3Object {
  Key: string;
  Body: NodeJS.ReadableStream;
}

class MockS3Client {
  private baseDir = path.resolve(process.cwd(), 'ingest-dropzone');

  constructor() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async listObjects(): Promise<string[]> {
    try {
        return fs.readdirSync(this.baseDir).filter(f => f.endsWith('.csv'));
    } catch (e) {
        return [];
    }
  }

  async getObject(key: string): Promise<S3Object> {
    const stream = fs.createReadStream(path.join(this.baseDir, key));
    return { Key: key, Body: stream };
  }

  async deleteObject(key: string) {
     fs.unlinkSync(path.join(this.baseDir, key));
  }
}

export class S3IngestService {
  private client = new MockS3Client();
  private processing = false;

  start() {
    // Poll every 5 seconds
    setInterval(() => this.poll(), 5000);
    console.log('S3 Ingest Service started (watching ingest-dropzone/)');
  }

  async poll() {
    if (this.processing) return;
    this.processing = true;
    try {
      const files = await this.client.listObjects();
      for (const file of files) {
        await this.processFile(file);
      }
    } catch (err) {
        console.error('S3 Poll Error:', err);
    } finally {
      this.processing = false;
    }
  }

  async processFile(key: string) {
    console.log(`Processing S3 file: ${key}`);
    try {
        const obj = await this.client.getObject(key);

        const rl = readline.createInterface({
          input: obj.Body,
          crlfDelay: Infinity
        });

        let headers: string[] | null = null;
        let records: any[] = [];
        const BATCH_SIZE = 1000;

        for await (const line of rl) {
          s3IngestBytes.inc(line.length);
          if (!headers) {
            headers = line.split(',');
            continue;
          }

          const values = line.split(',');
          const record: any = {};
          headers.forEach((h, i) => record[h.trim()] = values[i]?.trim());

          // Determine tenant from filename or default
          // e.g. tenantA_data.csv
          const tenantId = key.split('_')[0] || 'default';

          // Convert to Signal
          records.push({
              tenantId,
              type: 'csv_row',
              value: 1.0,
              source: `s3:${key}`,
              ts: new Date().toISOString(),
              metadata: record,
              purpose: 'analytics' // Default purpose
          });

          if (records.length >= BATCH_SIZE) {
            await ingestQueue.enqueue(tenantId, records);
            records = [];
          }
        }

        if (records.length > 0) {
            // Group by tenant
            const byTenant: Record<string, any[]> = {};
            records.forEach(r => {
                if (!byTenant[r.tenantId]) byTenant[r.tenantId] = [];
                byTenant[r.tenantId].push(r);
            });

            for (const t in byTenant) {
                await ingestQueue.enqueue(t, byTenant[t]);
            }
        }

        await this.client.deleteObject(key);
        console.log(`Finished processing ${key}`);
    } catch (error) {
        console.error(`Failed to process ${key}:`, error);
    }
  }
}

export const s3Ingest = new S3IngestService();
