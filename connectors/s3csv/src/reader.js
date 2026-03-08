"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3CSVReader = void 0;
const stream_1 = require("stream");
const csv_parse_1 = require("csv-parse");
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const api_1 = require("@opentelemetry/api");
const prom_client_1 = require("prom-client");
const tracer = api_1.trace.getTracer('s3csv-connector', '24.2.0');
// Metrics
const processedRows = new prom_client_1.Counter({
    name: 'ingest_rows_total',
    help: 'Total CSV rows processed',
    labelNames: ['bucket', 'key', 'status'],
});
const ingestThroughput = new prom_client_1.Gauge({
    name: 'ingest_rows_sec',
    help: 'Current ingest throughput in rows/sec',
    labelNames: ['worker_id'],
});
const ingestLag = new prom_client_1.Histogram({
    name: 'ingest_lag_ms',
    help: 'Processing lag from CSV row to storage',
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});
const memoryUsage = new prom_client_1.Gauge({
    name: 'ingest_memory_bytes',
    help: 'Memory usage of CSV processor',
    labelNames: ['worker_id'],
});
class BackpressureQueue {
    rows = [];
    highWaterMark;
    lowWaterMark;
    waitingForDrain = [];
    constructor(highWaterMark = 10000, lowWaterMark = 5000) {
        this.highWaterMark = highWaterMark;
        this.lowWaterMark = lowWaterMark;
    }
    async whenLowWatermark() {
        if (this.rows.length <= this.lowWaterMark) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.waitingForDrain.push(resolve);
        });
    }
    drain(count) {
        this.rows.splice(0, count);
        if (this.rows.length <= this.lowWaterMark) {
            const waiting = this.waitingForDrain.splice(0);
            waiting.forEach((resolve) => resolve());
        }
    }
    isFull() {
        return this.rows.length >= this.highWaterMark;
    }
}
class S3CSVReader {
    s3;
    queue;
    workerId;
    metricsInterval;
    lastRowCount = 0;
    constructor(workerId, queueConfig) {
        this.s3 = new aws_sdk_1.default.S3();
        this.workerId = workerId;
        this.queue = new BackpressureQueue(queueConfig?.high || 10000, queueConfig?.low || 5000);
        this.startMetricsCollection();
    }
    startMetricsCollection() {
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
    async streamCSVFromS3(bucket, key, onBatch, options = {}) {
        const { batchSize = 1000, skipHeader = true, delimiter = ',' } = options;
        return tracer.startActiveSpan('s3csv.stream', async (span) => {
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
                let batch = [];
                const startTime = Date.now();
                const csvParser = (0, csv_parse_1.parse)({
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
                const processor = new stream_1.Transform({
                    objectMode: true,
                    async transform(row, encoding, callback) {
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
                        }
                        catch (error) {
                            processedRows.inc({ bucket, key, status: 'error' });
                            span.recordException(error);
                            callback(error);
                        }
                    },
                });
                return new Promise((resolve, reject) => {
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
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    validateAndTransformRow(row) {
        const csvRow = {
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
    async processBatch(batch, onBatch, startTime) {
        const batchStartTime = Date.now();
        try {
            await onBatch([...batch]); // Copy to avoid mutation
            processedRows.inc({
                bucket: 'current',
                key: 'current',
                status: 'success',
            }, batch.length);
            const lagMs = Date.now() - startTime;
            ingestLag.observe(lagMs);
        }
        catch (error) {
            processedRows.inc({
                bucket: 'current',
                key: 'current',
                status: 'error',
            }, batch.length);
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
exports.S3CSVReader = S3CSVReader;
