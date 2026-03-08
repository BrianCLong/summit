"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STIXConnector = void 0;
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const node_crypto_1 = require("node:crypto");
const axios_1 = __importDefault(require("axios"));
// Similar to HTTP JSON but specifically for STIX 2.1 Bundles
class STIXConnector extends base_js_1.BaseConnector {
    url;
    collectionId;
    constructor(config) {
        super(config);
        this.url = config.config.url;
        this.collectionId = config.config.collectionId;
    }
    async connect() {
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        try {
            // TAXII discovery endpoint
            await axios_1.default.get(this.url + '/taxii2/', {
                headers: { 'Accept': 'application/taxii+json;version=2.1' }
            });
            return true;
        }
        catch {
            // Fallback for direct STIX file
            try {
                await axios_1.default.head(this.url);
                return true;
            }
            catch {
                return false;
            }
        }
    }
    async fetchSchema() {
        // STIX schema is fixed standard
        return {
            fields: [
                { name: 'type', type: 'string', nullable: false },
                { name: 'id', type: 'string', nullable: false },
                { name: 'spec_version', type: 'string', nullable: false },
                { name: 'objects', type: 'array', nullable: false }
            ],
            version: 1
        };
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        setImmediate(async () => {
            try {
                // Assume simple bundle URL for now
                const response = await axios_1.default.get(this.url);
                const bundle = response.data;
                if (bundle.objects && Array.isArray(bundle.objects)) {
                    for (const object of bundle.objects) {
                        stream.push(this.wrapEvent(object));
                        this.metrics.recordsProcessed++;
                    }
                }
                else {
                    // maybe it's a list of objects
                    if (Array.isArray(bundle)) {
                        for (const object of bundle) {
                            stream.push(this.wrapEvent(object));
                            this.metrics.recordsProcessed++;
                        }
                    }
                }
                stream.push(null);
            }
            catch (err) {
                stream.destroy(err);
                this.metrics.errors++;
            }
        });
        return stream;
    }
    async writeRecords(records) {
        if (!this.collectionId) {
            throw new Error('STIXConnector requires a collectionId for write operations');
        }
        try {
            // Push STIX bundle to TAXII collection
            const bundle = {
                type: 'bundle',
                id: `bundle--${(0, node_crypto_1.randomUUID)()}`,
                spec_version: '2.1',
                objects: records
            };
            await axios_1.default.post(`${this.url}/collections/${this.collectionId}/objects/`, bundle, { headers: { 'Content-Type': 'application/taxii+json;version=2.1' } });
            this.metrics.recordsProcessed += records.length;
        }
        catch (err) {
            this.logger.error({ err }, 'Failed to write records to TAXII');
            this.metrics.errors++;
            throw err;
        }
    }
}
exports.STIXConnector = STIXConnector;
