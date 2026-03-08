"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3CSVConnector = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const api_1 = require("@opentelemetry/api");
const csv_parse_1 = require("csv-parse");
const errors_1 = require("@intelgraph/errors");
const BaseConnector_1 = require("./BaseConnector");
const tracer = api_1.trace.getTracer('intelgraph-s3csv-connector');
class S3CSVConnector extends BaseConnector_1.BaseConnector {
    s3Client;
    config;
    constructor(config) {
        super(config);
        this.config = config;
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || 'us-west-2',
            endpoint: process.env.AWS_ENDPOINT_URL,
            credentials: process.env.AWS_ENDPOINT_URL
                ? {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                }
                : undefined,
            forcePathStyle: !!process.env.AWS_ENDPOINT_URL, // Required for MinIO
        });
    }
    async *ingest() {
        const span = tracer.startSpan('s3csv-ingest', {
            attributes: {
                'connector.type': 's3csv',
                'connector.source': this.config.name,
                'connector.url': this.config.url,
            },
        });
        try {
            const { bucket, key } = this.parseS3Url(this.config.url);
            span.setAttributes({
                's3.bucket': bucket,
                's3.key': key,
            });
            // List objects to handle prefix-based ingestion
            const objects = await this.listObjects(bucket, key);
            for (const obj of objects) {
                if (!obj.Key)
                    continue;
                const objectSpan = tracer.startSpan('process-s3-object', {
                    attributes: {
                        's3.object.key': obj.Key,
                        's3.object.size': obj.Size || 0,
                        's3.object.last_modified': obj.LastModified?.toISOString() || '',
                    },
                });
                try {
                    yield* this.processObject(bucket, obj.Key, {
                        source_system: 'demo-csv',
                        collection_method: 'batch_import',
                        source_url: `s3://${bucket}/${obj.Key}`,
                        collected_at: new Date().toISOString(),
                        file_hash: await this.calculateObjectHash(bucket, obj.Key),
                    });
                    objectSpan.setStatus({ code: 1 }); // OK
                }
                catch (error) {
                    objectSpan.recordException(error);
                    objectSpan.setStatus({ code: 2, message: error.message }); // ERROR
                    this.logger.error('Failed to process S3 object', {
                        bucket,
                        key: obj.Key,
                        error: error.message,
                    });
                }
                finally {
                    objectSpan.end();
                }
            }
            span.setStatus({ code: 1 }); // OK
            span.setAttributes({
                'ingest.objects_processed': objects.length,
            });
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message }); // ERROR
            throw errors_1.errorFactory.fromUnknown(error, {
                category: 'upstream',
                errorCode: 'UPSTREAM_S3_READ_FAILED',
                humanMessage: 'Failed to read from S3 during ingest.',
                suggestedAction: 'Verify bucket permissions and network connectivity.',
                context: { bucket, prefix },
            });
        }
        finally {
            span.end();
        }
    }
    parseS3Url(url) {
        const match = url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
        if (!match) {
            throw errors_1.errorFactory.validation({
                errorCode: 'VALIDATION_S3_URL',
                humanMessage: 'S3 URL is invalid.',
                developerMessage: `Invalid S3 URL format: ${url}`,
                suggestedAction: 'Use the s3://bucket/key convention.',
            });
        }
        return { bucket: match[1], key: match[2] };
    }
    async listObjects(bucket, prefix) {
        const command = new client_s3_1.ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: 1000,
        });
        const response = await this.s3Client.send(command);
        return response.Contents || [];
    }
    async *processObject(bucket, key, provenance) {
        const command = new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await this.s3Client.send(command);
        if (!response.Body) {
            throw errors_1.errorFactory.upstream({
                errorCode: 'UPSTREAM_EMPTY_BODY',
                humanMessage: 'S3 object response was empty.',
                developerMessage: `Empty response body for s3://${bucket}/${key}`,
                suggestedAction: 'Verify the object exists and contains data.',
                context: { bucket, key },
            });
        }
        const stream = response.Body;
        const parser = (0, csv_parse_1.parse)({
            delimiter: this.config.delimiter || ',',
            columns: this.config.headers !== false,
            skip_empty_lines: true,
            encoding: this.config.encoding || 'utf8',
        });
        let recordCount = 0;
        for await (const record of stream.pipe(parser)) {
            recordCount++;
            // Validate record against schema if provided
            if (this.config.schemaRef && this.schema) {
                try {
                    this.schema.parse(record);
                }
                catch (error) {
                    this.logger.warn('Schema validation failed for record', {
                        record_number: recordCount,
                        key,
                        error: error.message,
                    });
                    continue;
                }
            }
            // Transform according to datasources.yaml configuration
            const transformed = this.transformRecord(record);
            yield {
                id: transformed.entity_id || `${key}-${recordCount}`,
                type: transformed.type || 'unknown',
                name: transformed.entity_name || transformed.name || '',
                attributes: transformed,
                pii_flags: this.detectPII(transformed),
                source_id: `s3:${bucket}/${key}`,
                provenance,
                retention_tier: this.config.retention || 'standard-365d',
                purpose: this.config.purpose || 'investigation',
                region: 'US', // Enforced for Topicality
            };
        }
        this.logger.info('Processed S3 CSV object', {
            bucket,
            key,
            records_processed: recordCount,
        });
    }
    transformRecord(record) {
        // Apply transform rules from datasources.yaml
        const rules = this.config.transform_rules || {};
        return {
            entity_id: record[rules.id_field || 'id'],
            entity_name: record[rules.name_field || 'name'],
            type: record[rules.entity_type_field || 'type'],
            ...record,
        };
    }
    detectPII(record) {
        const piiFields = ['name', 'email', 'phone', 'address', 'ssn'];
        const piiFlags = {};
        for (const [key, value] of Object.entries(record)) {
            if (typeof value === 'string') {
                piiFlags[key] = this.isPIIField(key, value, piiFields);
            }
        }
        return piiFlags;
    }
    isPIIField(fieldName, value, piiFields) {
        // Simple heuristic - in production, use more sophisticated PII detection
        const lowerFieldName = fieldName.toLowerCase();
        return (piiFields.some((pii) => lowerFieldName.includes(pii)) ||
            /\b[\w\.-]+@[\w\.-]+\.\w+\b/.test(value) || // Email pattern
            /\b\d{3}-?\d{2}-?\d{4}\b/.test(value)); // SSN pattern
    }
    async calculateObjectHash(bucket, key) {
        // Simple implementation - in production, use proper crypto hash
        return `sha256:${Buffer.from(`${bucket}/${key}${Date.now()}`).toString('base64')}`;
    }
    async healthCheck() {
        try {
            const { bucket } = this.parseS3Url(this.config.url);
            await this.s3Client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: bucket,
                MaxKeys: 1,
            }));
            return true;
        }
        catch (error) {
            this.logger.error('S3 health check failed', {
                error: error.message,
            });
            return false;
        }
    }
}
exports.S3CSVConnector = S3CSVConnector;
