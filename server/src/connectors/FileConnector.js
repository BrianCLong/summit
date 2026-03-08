"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileConnector = void 0;
const BaseConnector_js_1 = require("./BaseConnector.js");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class FileConnector extends BaseConnector_js_1.BaseConnector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async fetchBatch(ctx, cursor) {
        return this.withResilience(async () => {
            // Simple implementation: Read full file if cursor is null/start, else return empty
            if (cursor === 'DONE') {
                return { records: [], nextCursor: 'DONE' };
            }
            const filePath = this.config.path;
            try {
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    // Directory listing logic could go here
                    return { records: [], nextCursor: 'DONE' };
                }
                // Determine if binary or text
                const ext = path.extname(filePath).toLowerCase();
                const isBinary = ['.pdf', '.png', '.jpg', '.jpeg', '.zip'].includes(ext);
                let records = [];
                if (isBinary) {
                    // Read as buffer
                    const buffer = await fs.readFile(filePath);
                    records = [{
                            path: filePath,
                            content: buffer, // Raw buffer
                            metadata: { size: stats.size, created: stats.birthtime }
                        }];
                }
                else {
                    // Read as text
                    const content = await fs.readFile(filePath, 'utf-8');
                    if (filePath.endsWith('.json')) {
                        try {
                            const parsed = JSON.parse(content);
                            records = Array.isArray(parsed) ? parsed : [parsed];
                        }
                        catch (e) {
                            records = [{ text: content, path: filePath, error: 'JSON parse failed' }];
                        }
                    }
                    else if (filePath.endsWith('.csv')) {
                        records = content.split('\n').filter((line) => line.trim().length > 0).map((line) => ({ raw: line }));
                    }
                    else {
                        records = [{ text: content, path: filePath }];
                    }
                }
                return { records, nextCursor: 'DONE' };
            }
            catch (err) {
                this.logger.error({ err, path: filePath }, 'Failed to read file');
                throw err;
            }
        }, ctx);
    }
}
exports.FileConnector = FileConnector;
