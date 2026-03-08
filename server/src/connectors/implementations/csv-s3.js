"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVConnector = void 0;
// @ts-nocheck
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const csv_parse_1 = require("csv-parse");
// Mocking S3 for sandbox safety (local file system simulation)
// In a real env, this would use AWS SDK
class CSVConnector extends base_js_1.BaseConnector {
    filePath;
    isS3;
    constructor(config) {
        super(config);
        this.filePath = config.config.path;
        this.isS3 = config.config.path.startsWith('s3://');
    }
    async connect() {
        if (this.isS3) {
            // In this sandbox, we can't access real S3.
            // We will assume a local mount or mock.
            this.logger.info(`Simulating S3 connection to ${this.filePath}`);
        }
        else {
            if (!fs.existsSync(this.filePath)) {
                // It might be a relative path for testing
                if (fs.existsSync(path.join(process.cwd(), this.filePath))) {
                    this.filePath = path.join(process.cwd(), this.filePath);
                }
            }
        }
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        if (this.isS3)
            return true; // Mock success for S3
        try {
            await fs.promises.access(this.filePath, fs.constants.R_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    async fetchSchema() {
        return new Promise((resolve, reject) => {
            const stream = this.isS3
                ? this.mockS3Stream() // Replace with real S3 stream
                : fs.createReadStream(this.filePath);
            const parser = stream.pipe((0, csv_parse_1.parse)({
                delimiter: ',',
                columns: true,
                to: 1 // Read only first row
            }));
            let fields = [];
            parser.on('data', (row) => {
                fields = Object.keys(row).map(key => ({
                    name: key,
                    type: 'string', // CSV is always string initially
                    nullable: true
                }));
            });
            parser.on('end', () => {
                resolve({ fields, version: 1 });
            });
            parser.on('error', (err) => {
                reject(err);
            });
        });
    }
    async readStream(options) {
        const rawStream = this.isS3
            ? this.mockS3Stream()
            : fs.createReadStream(this.filePath);
        const parser = rawStream.pipe((0, csv_parse_1.parse)({
            delimiter: ',',
            columns: true,
            skip_empty_lines: true
        }));
        const outputStream = new stream_1.Readable({ objectMode: true, read() { } });
        parser.on('data', (record) => {
            outputStream.push(this.wrapEvent(record));
            this.metrics.recordsProcessed++;
        });
        parser.on('end', () => {
            outputStream.push(null);
        });
        parser.on('error', (err) => {
            outputStream.destroy(err);
            this.metrics.errors++;
        });
        return outputStream;
    }
    mockS3Stream() {
        const s = new stream_1.Readable();
        s.push('id,name,email\n1,John Doe,john@example.com\n2,Jane Doe,jane@example.com');
        s.push(null);
        return s;
    }
}
exports.CSVConnector = CSVConnector;
