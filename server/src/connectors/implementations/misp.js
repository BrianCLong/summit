"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISPConnector = void 0;
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
class MISPConnector extends base_js_1.BaseConnector {
    url;
    apiKey;
    constructor(config) {
        super(config);
        this.url = config.config.url;
        this.apiKey = config.config.apiKey; // In real world, use secrets manager
    }
    async connect() {
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        try {
            await axios_1.default.get(`${this.url}/events/index`, {
                headers: { 'Authorization': this.apiKey, 'Accept': 'application/json' }
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async fetchSchema() {
        return {
            fields: [
                { name: 'id', type: 'string', nullable: false },
                { name: 'info', type: 'string', nullable: false },
                { name: 'Attribute', type: 'array', nullable: true },
                { name: 'Object', type: 'array', nullable: true }
            ],
            version: 1
        };
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        setImmediate(async () => {
            try {
                // Fetch events
                const response = await axios_1.default.post(`${this.url}/events/restSearch`, { returnFormat: 'json', limit: 100 }, { headers: { 'Authorization': this.apiKey, 'Accept': 'application/json' } });
                const responseData = response.data;
                const events = responseData.response || responseData;
                if (Array.isArray(events)) {
                    for (const event of events) {
                        stream.push(this.wrapEvent(event));
                        this.metrics.recordsProcessed++;
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
        for (const record of records) {
            try {
                // Push event to MISP
                await axios_1.default.post(`${this.url}/events/add`, record, { headers: { 'Authorization': this.apiKey, 'Accept': 'application/json' } });
                this.metrics.recordsProcessed++;
            }
            catch (err) {
                this.logger.error({ err, recordId: record.id }, 'Failed to write record to MISP');
                this.metrics.errors++;
            }
        }
    }
}
exports.MISPConnector = MISPConnector;
