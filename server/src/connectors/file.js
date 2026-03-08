"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSourceConnector = void 0;
const base_js_1 = require("./base.js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class FileSourceConnector extends base_js_1.BaseSourceConnector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async fetchBatch(ctx, cursor) {
        try {
            // Simplistic implementation: assumes path is a directory
            // Cursor is the filename we last processed
            const files = await promises_1.default.readdir(this.config.path);
            const sortedFiles = files.sort();
            let startIndex = 0;
            if (cursor) {
                startIndex = sortedFiles.indexOf(cursor) + 1;
            }
            if (startIndex >= sortedFiles.length) {
                return { records: [], nextCursor: cursor };
            }
            const fileToProcess = sortedFiles[startIndex];
            const filePath = path_1.default.join(this.config.path, fileToProcess);
            ctx.logger.info(`Processing file: ${fileToProcess}`);
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            let records = [];
            if (this.config.format === 'json') {
                records = JSON.parse(content);
                if (!Array.isArray(records))
                    records = [records];
            }
            else if (this.config.format === 'text') {
                records = [{ content, filename: fileToProcess }];
            }
            // In a real implementation, we would stream this or handle large files better
            // For now, we process one file per batch call
            return {
                records,
                nextCursor: fileToProcess,
            };
        }
        catch (err) {
            this.handleError(ctx, err);
            throw err;
        }
    }
}
exports.FileSourceConnector = FileSourceConnector;
