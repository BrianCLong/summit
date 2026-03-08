"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpSourceConnector = void 0;
const base_js_1 = require("./base.js");
const axios_1 = __importDefault(require("axios"));
class HttpSourceConnector extends base_js_1.BaseSourceConnector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async fetchBatch(ctx, cursor) {
        try {
            const params = {};
            if (this.config.pagination) {
                if (cursor && this.config.pagination.cursorParam) {
                    params[this.config.pagination.cursorParam] = cursor;
                }
            }
            const response = await (0, axios_1.default)({
                method: this.config.method || 'GET',
                url: this.config.url,
                headers: this.config.headers,
                params,
            });
            const data = response.data;
            let records = [];
            if (Array.isArray(data)) {
                records = data;
            }
            else if (data.items && Array.isArray(data.items)) {
                records = data.items;
            }
            else {
                records = [data];
            }
            let nextCursor = null;
            if (this.config.pagination?.outputCursorPath) {
                // Simple dot notation access
                nextCursor = this.config.pagination.outputCursorPath
                    .split('.')
                    .reduce((o, i) => o?.[i], data);
            }
            return {
                records,
                nextCursor: nextCursor || null,
            };
        }
        catch (err) {
            this.handleError(ctx, err);
            throw err;
        }
    }
}
exports.HttpSourceConnector = HttpSourceConnector;
