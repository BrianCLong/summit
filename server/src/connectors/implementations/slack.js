"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackConnector = void 0;
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
class SlackConnector extends base_js_1.BaseConnector {
    token;
    channelId;
    constructor(config) {
        super(config);
        this.token = config.config.token;
        this.channelId = config.config.channelId;
    }
    async connect() {
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        try {
            await axios_1.default.post('https://slack.com/api/auth.test', {}, {
                headers: { Authorization: `Bearer ${this.token}` }
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
                { name: 'type', type: 'string', nullable: false },
                { name: 'ts', type: 'string', nullable: false },
                { name: 'user', type: 'string', nullable: true },
                { name: 'text', type: 'string', nullable: true }
            ],
            version: 1
        };
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        setImmediate(async () => {
            try {
                const response = await axios_1.default.post('https://slack.com/api/conversations.history', { channel: this.channelId, limit: 100 }, { headers: { Authorization: `Bearer ${this.token}` } });
                if (response.data.ok && response.data.messages) {
                    for (const msg of response.data.messages) {
                        stream.push(this.wrapEvent(msg));
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
}
exports.SlackConnector = SlackConnector;
