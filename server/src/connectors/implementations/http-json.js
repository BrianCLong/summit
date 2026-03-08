"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPJSONConnector = void 0;
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
class HTTPJSONConnector extends base_js_1.BaseConnector {
    url;
    headers;
    method;
    constructor(config) {
        super(config);
        this.url = config.config.url;
        this.headers = config.config.headers || {};
        this.method = config.config.method || 'GET';
    }
    async connect() {
        this.isConnected = true;
        this.logger.info(`Connected to HTTP source: ${this.url}`);
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        try {
            await axios_1.default.request({
                url: this.url,
                method: 'HEAD',
                headers: this.headers,
                timeout: 5000
            });
            return true;
        }
        catch (err) {
            // Fallback to GET if HEAD fails
            try {
                await axios_1.default.request({
                    url: this.url,
                    method: 'GET',
                    headers: this.headers,
                    params: { limit: 1 },
                    timeout: 5000
                });
                return true;
            }
            catch (e) {
                this.logger.error({ err }, 'Connection test failed');
                return false;
            }
        }
    }
    async fetchSchema() {
        try {
            const response = await axios_1.default.request({
                url: this.url,
                method: this.method,
                headers: this.headers,
                params: { limit: 1 }
            });
            const data = response.data;
            let sample = Array.isArray(data) ? data[0] : data;
            // If the response wraps the data (e.g. { data: [...] })
            if (data.data && Array.isArray(data.data)) {
                sample = data.data[0];
            }
            if (!sample) {
                return { fields: [], version: 1 };
            }
            const fields = Object.keys(sample).map(key => ({
                name: key,
                type: typeof sample[key],
                nullable: true
            }));
            return { fields, version: 1 };
        }
        catch (err) {
            throw new Error(`Failed to fetch schema: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        // In a real implementation, this should handle pagination
        // For now, we'll just fetch once and push
        setImmediate(async () => {
            try {
                const response = await axios_1.default.request({
                    url: this.url,
                    method: this.method,
                    headers: this.headers,
                    // Add pagination params here if configured
                });
                let items = response.data;
                if (this.config.config.dataPath) {
                    // simple json path support
                    const parts = this.config.config.dataPath.split('.');
                    for (const part of parts) {
                        items = items[part];
                    }
                }
                else if (items.data && Array.isArray(items.data)) {
                    items = items.data;
                }
                if (Array.isArray(items)) {
                    for (const item of items) {
                        await this.throttle(); // Rate limit per batch or item
                        stream.push(this.wrapEvent(item));
                        this.metrics.recordsProcessed++;
                    }
                }
                else {
                    stream.push(this.wrapEvent(items));
                    this.metrics.recordsProcessed++;
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
}
exports.HTTPJSONConnector = HTTPJSONConnector;
