"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpConnector = void 0;
const BaseConnector_js_1 = require("./BaseConnector.js");
const axios_1 = __importDefault(require("axios"));
class HttpConnector extends BaseConnector_js_1.BaseConnector {
    client;
    config;
    constructor(config) {
        super();
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: config.url,
            timeout: 10000,
            headers: config.headers,
        });
    }
    async fetchBatch(ctx, cursor) {
        return this.withResilience(async () => {
            const params = {};
            if (this.config.pagination) {
                if (cursor) {
                    params[this.config.pagination.param] = cursor;
                }
                if (this.config.pagination.limitParam && this.config.pagination.limit) {
                    params[this.config.pagination.limitParam] = this.config.pagination.limit;
                }
            }
            const response = await this.client.request({
                method: this.config.method || 'GET',
                data: this.config.body,
                params,
            });
            const data = response.data;
            let records = [];
            if (this.config.extractionPath) {
                // Simple extraction logic
                records = this.resolvePath(data, this.config.extractionPath);
            }
            else if (Array.isArray(data)) {
                records = data;
            }
            else {
                records = [data];
            }
            // Determine next cursor
            let nextCursor = null;
            // Heuristic: if we got fewer records than limit, we are likely done.
            // Real impl needs specific logic per API style (Link headers, next_page field, etc)
            if (this.config.pagination && records.length > 0) {
                // Placeholder for pagination logic
                // For now, assume if we got data and it's cursor based, we might need manual nextCursor logic
                // returning null to stop for simple MVP unless specified
                nextCursor = null;
            }
            else {
                nextCursor = null;
            }
            return { records, nextCursor };
        }, ctx);
    }
    resolvePath(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj) || [];
    }
}
exports.HttpConnector = HttpConnector;
