"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3CsvConnector = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const csv_parser_1 = __importDefault(require("csv-parser"));
const Connector_1 = require("../lib/Connector"); // Assumed location
const logger_1 = require("../utils/logger"); // Assumed location
class S3CsvConnector extends Connector_1.Connector {
    s3Client;
    stream = null;
    constructor(config) {
        super(config);
        this.s3Client = new client_s3_1.S3Client({
            region: config.parameters.region || 'us-east-1',
            credentials: {
                accessKeyId: config.parameters.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: config.parameters.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
    }
    async connect() {
        try {
            logger_1.logger.info({
                message: 'Connecting to S3',
                bucket: this.config.parameters.bucket,
                key: this.config.parameters.key,
            });
            // Basic connectivity check (HeadObject would be better, but we'll trust GetObject for MVP)
            this.connected = true;
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to S3', error);
            throw error;
        }
    }
    async disconnect() {
        this.stream = null;
        this.connected = false;
        this.s3Client.destroy();
    }
    async *fetchData() {
        if (!this.connected)
            throw new Error('Not connected');
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.config.parameters.bucket,
                Key: this.config.parameters.key,
            });
            const response = await this.s3Client.send(command);
            if (!response.Body) {
                throw new Error('Empty response body from S3');
            }
            this.stream = response.Body;
            const records = [];
            const parser = this.stream.pipe((0, csv_parser_1.default)({
                separator: this.config.parameters.delimiter || ',',
                headers: this.config.parameters.hasHeaders !== false,
            }));
            for await (const row of parser) {
                const record = this.processRow(row);
                if (record) {
                    records.push(record);
                }
                // Batch yielding
                if (records.length >= (this.config.batchSize || 100)) {
                    yield records.splice(0, records.length);
                }
            }
            // Yield remaining
            if (records.length > 0) {
                yield records;
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching data from S3', error);
            throw error;
        }
    }
    processRow(row) {
        // Basic provenance attachment
        const provenance = {
            source: 's3',
            bucket: this.config.parameters.bucket,
            key: this.config.parameters.key,
            ingested_at: new Date().toISOString(),
            row_hash: this.calculateHash(JSON.stringify(row))
        };
        // Schema mapping would go here based on config
        return {
            id: row.id || this.generateId(),
            type: this.config.parameters.entityType || 'Dynamic',
            properties: row,
            provenance,
        };
    }
    calculateHash(data) {
        // Placeholder for hash function
        return `hash-${data.length}`;
    }
    generateId() {
        return `s3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.S3CsvConnector = S3CsvConnector;
