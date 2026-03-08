"use strict";
/**
 * Ingest Adapters Index
 *
 * Re-exports all adapter implementations for easy importing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookAdapter = exports.KafkaAdapter = exports.S3Adapter = exports.BaseAdapter = void 0;
exports.createAdapter = createAdapter;
var base_js_1 = require("./base.js");
Object.defineProperty(exports, "BaseAdapter", { enumerable: true, get: function () { return base_js_1.BaseAdapter; } });
var s3_js_1 = require("./s3.js");
Object.defineProperty(exports, "S3Adapter", { enumerable: true, get: function () { return s3_js_1.S3Adapter; } });
var kafka_js_1 = require("./kafka.js");
Object.defineProperty(exports, "KafkaAdapter", { enumerable: true, get: function () { return kafka_js_1.KafkaAdapter; } });
var webhook_js_1 = require("./webhook.js");
Object.defineProperty(exports, "WebhookAdapter", { enumerable: true, get: function () { return webhook_js_1.WebhookAdapter; } });
const s3_js_2 = require("./s3.js");
const kafka_js_2 = require("./kafka.js");
const webhook_js_2 = require("./webhook.js");
function createAdapter(options) {
    const { config, events, logger, checkpointStore, dlqStore } = options;
    switch (config.source_type) {
        case 's3':
            return new s3_js_2.S3Adapter({ config, events, logger, checkpointStore, dlqStore });
        case 'kafka':
            return new kafka_js_2.KafkaAdapter({ config, events, logger, checkpointStore, dlqStore });
        case 'webhook':
            return new webhook_js_2.WebhookAdapter({ config, events, logger, checkpointStore, dlqStore });
        case 'gcs':
            // GCS adapter would be similar to S3 with Google Cloud Storage SDK
            throw new Error('GCS adapter not yet implemented');
        case 'sftp':
            // SFTP adapter would use ssh2-sftp-client
            throw new Error('SFTP adapter not yet implemented');
        default:
            throw new Error(`Unknown source type: ${config.source_type}`);
    }
}
