"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubConnector = void 0;
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
class GitHubConnector extends base_js_1.BaseConnector {
    repo;
    token;
    constructor(config) {
        super(config);
        this.repo = config.config.repo; // owner/repo
        this.token = config.config.token;
    }
    async connect() {
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        try {
            await axios_1.default.get(`https://api.github.com/repos/${this.repo}`, {
                headers: { Authorization: `token ${this.token}`, 'User-Agent': 'IntelGraph' }
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
                { name: 'id', type: 'number', nullable: false },
                { name: 'type', type: 'string', nullable: false }, // issue, pr, commit
                { name: 'title', type: 'string', nullable: true },
                { name: 'body', type: 'string', nullable: true },
                { name: 'user', type: 'json', nullable: false },
                { name: 'created_at', type: 'string', nullable: false }
            ],
            version: 1
        };
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        setImmediate(async () => {
            try {
                // Fetch issues for example
                const response = await axios_1.default.get(`https://api.github.com/repos/${this.repo}/issues`, {
                    headers: { Authorization: `token ${this.token}`, 'User-Agent': 'IntelGraph' },
                    params: { state: 'all', per_page: 100 }
                });
                for (const item of response.data) {
                    stream.push(this.wrapEvent({ ...item, type: 'issue' }));
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
exports.GitHubConnector = GitHubConnector;
