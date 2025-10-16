import { Readable, Transform } from 'stream';
import { parse } from 'csv-parse';
import AWS from 'aws-sdk';
import { trace, Span } from '@opentelemetry/api';
import { register, Counter, Histogram, Gauge } from 'prom-client';

const tracer = trace.getTracer('s3csv-connector', '24.2.0');

// Metrics
const processedRows = new Counter({
  name: 'ingest_rows_total',
  help: 'Total CSV rows processed',
  labelNames: ['bucket', 'key', 'status'],
});

const ingestThroughput = new Gauge({
  name: 'ingest_rows_sec',
  help: 'Current ingest throughput in rows/sec',
  labelNames: ['worker_id'],
});

const ingestLag = new Histogram({
  name: 'ingest_lag_ms',
  help: 'Processing lag from CSV row to storage',
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

const memoryUsage = new Gauge({
  name: 'ingest_memory_bytes',
  help: 'Memory usage of CSV processor',
  labelNames: ['worker_id'],
});

interface CSVRow {
  tenantId: string;
  type: string;
  value: number;
  weight?: number;
  source: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ProcessingQueue {
  rows: CSVRow[];
  highWaterMark: number;
  lowWaterMark: number;
  whenLowWatermark(): Promise<void>;
}

class BackpressureQueue implements ProcessingQueue {
  public rows: CSVRow[] = [];
  public readonly highWaterMark: number;
  public readonly lowWaterMark: number;
  private waitingForDrain: ((value: void) => void)[] = [];

  constructor(highWaterMark = 10000, lowWaterMark = 5000) {
    this.highWaterMark = highWaterMark;
    this.lowWaterMark = lowWaterMark;
  }

  async whenLowWatermark(): Promise<void> {
    if (this.rows.length <= this.lowWaterMark) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitingForDrain.push(resolve);
    });
  }

  drain(count: number) {
    this.rows.splice(0, count);
    if (this.rows.length <= this.lowWaterMark) {
      const waiting = this.waitingForDrain.splice(0);
      waiting.forEach((resolve) => resolve());
    }
  }

  isFull(): boolean {
    return this.rows.length >= this.highWaterMark;
  }
}

export class S3CSVReader {
  private s3: AWS.S3;
  private queue: BackpressureQueue;
  private workerId: string;
  private metricsInterval?: NodeJS.Timeout;
  private lastRowCount = 0;

  constructor(workerId: string, queueConfig?: { high: number; low: number }) {
    this.s3 = new AWS.S3();
    this.workerId = workerId;
    this.queue = new BackpressureQueue(
      queueConfig?.high || 10000,
      queueConfig?.low || 5000,
    );

    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      const currentRows = processedRows
        .get()
        .values.filter((v) => v.labels.status === 'success')
        .reduce((sum, v) => sum + v.value, 0);

      const rowsPerSec = (currentRows - this.lastRowCount) / 5; // 5 second interval
      ingestThroughput.set({ worker_id: this.workerId }, rowsPerSec);
      this.lastRowCount = currentRows;

      // Memory usage
      const memUsage = process.memoryUsage();
      memoryUsage.set({ worker_id: this.workerId }, memUsage.heapUsed);
    }, 5000);
  }

  async streamCSVFromS3(
    bucket: string,
    key: string,
    onBatch: (rows: CSVRow[]) => Promise<void>,
    options: {
      batchSize?: number;
      skipHeader?: boolean;
      delimiter?: string;
    } = {},
  ): Promise<void> {
    const { batchSize = 1000, skipHeader = true, delimiter = ',' } = options;

    return tracer.startActiveSpan('s3csv.stream', async (span: Span) => {
      span.setAttributes({
        's3.bucket': bucket,
        's3.key': key,
        'csv.batch_size': batchSize,
        'worker.id': this.workerId,
      });

      try {
        const s3Stream = this.s3
          .getObject({ Bucket: bucket, Key: key })
          .createReadStream();
        let rowCount = 0;
        let batch: CSVRow[] = [];
        const startTime = Date.now();

        const csvParser = parse({
          delimiter,
          columns: skipHeader
            ? true
            : [
                'tenantId',
                'type',
                'value',
                'weight',
                'source',
                'timestamp',
                'metadata',
              ],
          skip_empty_lines: true,
          trim: true,
          cast: true,
        });

        const processor = new Transform({
          objectMode: true,
          async transform(row: any, encoding, callback) {
            try {
              const csvRow = this.validateAndTransformRow(row);
              batch.push(csvRow);
              rowCount++;

              // Check backpressure before adding to queue
              if (this.queue.isFull()) {
                await this.queue.whenLowWatermark();
              }

              if (batch.length >= batchSize) {
                await this.processBatch(batch, onBatch, startTime);
                batch = [];
              }

              callback();
            } catch (error) {
              processedRows.inc({ bucket, key, status: 'error' });
              span.recordException(error as Error);
              callback(error);
            }
          },
        });

        return new Promise<void>((resolve, reject) => {
          s3Stream
            .pipe(csvParser)
            .pipe(processor)
            .on('finish', async () => {
              // Process remaining batch
              if (batch.length > 0) {
                await this.processBatch(batch, onBatch, startTime);
              }

              span.setAttributes({
                'csv.rows_processed': rowCount,
                'csv.duration_ms': Date.now() - startTime,
              });

              resolve();
            })
            .on('error', (error) => {
              span.recordException(error);
              span.setStatus({ code: 2, message: error.message });
              reject(error);
            });
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private validateAndTransformRow(row: any): CSVRow {
    const csvRow: CSVRow = {
      tenantId: row.tenantId || row.tenant_id,
      type: row.type,
      value: parseFloat(row.value),
      weight: row.weight ? parseFloat(row.weight) : 1.0,
      source: row.source || 's3-csv',
      timestamp: row.timestamp || new Date().toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };

    // Validation
    if (!csvRow.tenantId || !csvRow.type || isNaN(csvRow.value)) {
      throw new Error(`Invalid CSV row: ${JSON.stringify(row)}`);
    }

    return csvRow;
  }

  private async processBatch(
    batch: CSVRow[],
    onBatch: (rows: CSVRow[]) => Promise<void>,
    startTime: number,
  ): Promise<void> {
    const batchStartTime = Date.now();

    try {
      await onBatch([...batch]); // Copy to avoid mutation

      processedRows.inc(
        {
          bucket: 'current',
          key: 'current',
          status: 'success',
        },
        batch.length,
      );

      const lagMs = Date.now() - startTime;
      ingestLag.observe(lagMs);
    } catch (error) {
      processedRows.inc(
        {
          bucket: 'current',
          key: 'current',
          status: 'error',
        },
        batch.length,
      );
      throw error;
    }
  }

  async getQueueStatus() {
    return {
      workerId: this.workerId,
      queueLength: this.queue.rows.length,
      highWaterMark: this.queue.highWaterMark,
      lowWaterMark: this.queue.lowWaterMark,
      isFull: this.queue.isFull(),
    };
  }

  destroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}
