"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayClient = void 0;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const crypto_1 = require("crypto");
class GatewayClient {
    url;
    queries;
    headers;
    constructor(options) {
        this.url = options.url;
        this.queries = options.queries;
        this.headers = options.headers || {};
    }
    async query(name, variables) {
        const query = this.queries[name];
        if (!query) {
            throw new Error(`Unknown query: ${name}`);
        }
        const hash = (0, crypto_1.createHash)('sha256').update(query).digest('hex');
        const res = await (0, cross_fetch_1.default)(this.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...this.headers },
            body: JSON.stringify({
                query,
                variables,
                extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
            }),
        });
        if (!res.ok) {
            throw new Error(`Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (json.errors) {
            throw new Error(JSON.stringify(json.errors));
        }
        return json.data;
    }
}
exports.GatewayClient = GatewayClient;
