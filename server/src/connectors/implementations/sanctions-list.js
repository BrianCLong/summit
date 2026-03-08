"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanctionsListConnector = void 0;
// @ts-nocheck
const base_js_1 = require("../base.js");
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
const csv_parse_1 = require("csv-parse");
// Specifically for OFAC SDN or similar lists
class SanctionsListConnector extends base_js_1.BaseConnector {
    url;
    constructor(config) {
        super(config);
        this.url = config.config.url || 'https://www.treasury.gov/ofac/downloads/sdn.csv';
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
        return {
            fields: [
                { name: 'ent_num', type: 'string', nullable: false },
                { name: 'SDN_Name', type: 'string', nullable: false },
                { name: 'SDN_Type', type: 'string', nullable: true },
                { name: 'Program', type: 'string', nullable: true },
                { name: 'Title', type: 'string', nullable: true },
                { name: 'Call_Sign', type: 'string', nullable: true },
                { name: 'Vess_type', type: 'string', nullable: true },
                { name: 'Tonnage', type: 'string', nullable: true },
                { name: 'GRT', type: 'string', nullable: true },
                { name: 'Vess_flag', type: 'string', nullable: true },
                { name: 'Vess_owner', type: 'string', nullable: true },
                { name: 'Remarks', type: 'string', nullable: true }
            ],
            version: 1
        };
    }
    async readStream(options) {
        const stream = new stream_1.Readable({ objectMode: true, read() { } });
        setImmediate(async () => {
            try {
                const response = await axios_1.default.get(this.url, { responseType: 'stream' });
                const parser = response.data.pipe((0, csv_parse_1.parse)({ columns: true, relax_quotes: true }));
                parser.on('data', (record) => {
                    stream.push(this.wrapEvent(record));
                    this.metrics.recordsProcessed++;
                });
                parser.on('end', () => stream.push(null));
                parser.on('error', (err) => stream.destroy(err));
            }
            catch (err) {
                stream.destroy(err);
                this.metrics.errors++;
            }
        });
        return stream;
    }
}
exports.SanctionsListConnector = SanctionsListConnector;
