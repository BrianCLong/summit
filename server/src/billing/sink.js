"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingAdapter = exports.BillingAdapter = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const pino = pino_1.default.default || pino_1.default;
const logger = pino({ name: 'BillingAdapter' });
class BillingAdapter {
    s3 = null;
    bucket;
    enabled;
    secret;
    constructor() {
        this.enabled = process.env.BILLING_ENABLED === 'true';
        this.bucket = process.env.BILLING_BUCKET || 'billing-exports';
        this.secret = process.env.BILLING_HMAC_SECRET || 'dev-secret';
        if (this.enabled) {
            try {
                this.s3 = new client_s3_1.S3Client({
                    region: process.env.AWS_REGION || 'us-east-1',
                    maxAttempts: 3 // AWS SDK built-in retries
                });
            }
            catch (err) {
                logger.error({ err }, "Failed to initialize S3 client");
                this.enabled = false; // Disable if client fails
            }
        }
    }
    sign(data) {
        return (0, crypto_1.createHmac)('sha256', this.secret).update(data).digest('hex');
    }
    // Simple CSV escape function
    escapeCsv(field) {
        if (field === null || field === undefined)
            return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }
    async exportUsage(record) {
        if (!this.enabled) {
            logger.info({ tenant: record.tenant_id }, "Billing adapter disabled, skipping export");
            return "skipped:disabled";
        }
        if (!this.s3) {
            throw new Error("Billing adapter enabled but S3 client not initialized");
        }
        // Construct the payload WITHOUT signature first
        const fields = [
            record.tenant_id,
            record.period_start,
            record.period_end,
            record.api_calls,
            record.ingest_events,
            record.egress_gb,
            record.plan,
            record.quota_overrides
        ];
        // Create the canonical string for signing (CSV format of fields)
        const payloadToSign = fields.map(this.escapeCsv).join(',');
        // Sign the canonical string
        const signature = this.sign(payloadToSign);
        // Final CSV line includes signature
        const csvLine = `${payloadToSign},${signature}`;
        const date = record.period_start.slice(0, 10);
        const key = `usage/date=${date}/tenant=${record.tenant_id}/usage-${(0, crypto_1.randomUUID)()}.csv`;
        let attempts = 0;
        const maxRetries = 3;
        while (attempts < maxRetries) {
            try {
                await this.s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: csvLine,
                    ContentType: 'text/csv'
                }));
                logger.info({ tenant: record.tenant_id, key }, "Usage exported successfully");
                return `s3://${this.bucket}/${key}`;
            }
            catch (err) {
                attempts++;
                logger.warn({ err, attempts, tenant: record.tenant_id }, "Failed to export usage, retrying...");
                if (attempts >= maxRetries) {
                    logger.error({ err, tenant: record.tenant_id }, "Max retries reached for usage export");
                    throw err;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            }
        }
        return "failed";
    }
}
exports.BillingAdapter = BillingAdapter;
exports.billingAdapter = new BillingAdapter();
