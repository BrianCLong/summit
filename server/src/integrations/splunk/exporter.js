"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPORT_SENSITIVE = exports.EXPORT_COMPRESSION = exports.SplunkSIEMSink = void 0;
exports.exportToSplunk = exportToSplunk;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class SplunkSIEMSink {
    config;
    constructor(config) {
        this.config = config;
    }
    async send(events) {
        if (!this.config.enabled)
            return;
        // Transform events to Splunk HEC format
        const payload = events.map(e => ({
            time: e.timestamp.getTime() / 1000,
            host: e.source, // or hostname
            source: this.config.source || 'switchboard',
            sourcetype: this.config.sourcetype || '_json',
            index: this.config.index || 'main',
            event: e
        })).map(e => JSON.stringify(e)).join('\n'); // HEC supports batching with newlines
        try {
            await axios_1.default.post(this.config.endpoint, payload, {
                headers: {
                    'Authorization': `Splunk ${this.config.token}`,
                    'Content-Type': 'application/json' // HEC expects this, or generic text
                },
                timeout: 5000,
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: this.config.verifySsl !== false
                })
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to export to Splunk', { error: error.message });
            throw error;
        }
    }
    async testConnection() {
        try {
            // Send a dummy health check event
            await axios_1.default.post(this.config.endpoint, JSON.stringify({ event: { message: "connection check" } }), {
                headers: { 'Authorization': `Splunk ${this.config.token}` },
                timeout: 5000,
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: this.config.verifySsl !== false
                })
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.SplunkSIEMSink = SplunkSIEMSink;
exports.EXPORT_COMPRESSION = process.env.EXPORT_COMPRESSION !== 'false';
exports.EXPORT_SENSITIVE = process.env.ENABLE_SENSITIVE_EXPORTS === 'true';
// Legacy stub
function exportToSplunk(payload) {
    if (exports.EXPORT_SENSITIVE) {
        // send full payload
    }
}
