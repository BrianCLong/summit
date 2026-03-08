"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSConnector = void 0;
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
class RSSConnector extends base_js_1.BaseConnector {
    url;
    constructor(config) {
        super(config);
        this.url = config.config.url;
    }
    async connect() {
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        try {
            await axios_1.default.get(this.url);
            return true;
        }
        catch {
            return false;
        }
    }
    async fetchSchema() {
        return {
            fields: [
                { name: 'title', type: 'string', nullable: false },
                { name: 'link', type: 'string', nullable: false },
                { name: 'pubDate', type: 'string', nullable: true },
                { name: 'content', type: 'string', nullable: true },
                { name: 'guid', type: 'string', nullable: true }
            ],
            version: 1
        };
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        // In real implementation, use rss-parser
        // const Parser = require('rss-parser');
        // const parser = new Parser();
        setImmediate(async () => {
            try {
                // const feed = await parser.parseURL(this.url);
                // Mock for now or raw fetch
                const response = await axios_1.default.get(this.url);
                // Naive regex parsing for demo if no parser avail, or just wrap raw XML
                stream.push(this.wrapEvent({ raw: response.data }));
                this.metrics.recordsProcessed++;
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
exports.RSSConnector = RSSConnector;
