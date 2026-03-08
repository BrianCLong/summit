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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTIFeedConnector = void 0;
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
const readline = __importStar(require("readline"));
// Generic CTI Feed (usually simple line-based text or CSV or JSON)
class CTIFeedConnector extends base_js_1.BaseConnector {
    url;
    format;
    constructor(config) {
        super(config);
        this.url = config.config.url;
        this.format = config.config.format || 'text';
    }
    async connect() {
        this.isConnected = true;
    }
    async disconnect() {
        this.isConnected = false;
    }
    async testConnection() {
        try {
            await axios_1.default.head(this.url);
            return true;
        }
        catch {
            return false;
        }
    }
    async fetchSchema() {
        if (this.format === 'json') {
            return { fields: [{ name: 'data', type: 'json', nullable: false }], version: 1 };
        }
        return { fields: [{ name: 'line', type: 'string', nullable: false }], version: 1 };
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        setImmediate(async () => {
            try {
                const response = await axios_1.default.get(this.url, { responseType: 'stream' });
                // Just pipe raw chunks or lines
                const rl = readline.createInterface({ input: response.data });
                rl.on('line', (line) => {
                    if (!line || line.startsWith('#'))
                        return; // Skip comments
                    stream.push(this.wrapEvent({ raw: line }));
                    this.metrics.recordsProcessed++;
                });
                rl.on('close', () => {
                    stream.push(null);
                });
                response.data.on('error', (err) => {
                    stream.destroy(err);
                    this.metrics.errors++;
                });
            }
            catch (err) {
                stream.destroy(err);
                this.metrics.errors++;
            }
        });
        return stream;
    }
}
exports.CTIFeedConnector = CTIFeedConnector;
