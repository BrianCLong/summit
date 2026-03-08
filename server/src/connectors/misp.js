"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MispConnector = void 0;
const BaseConnector_js_1 = require("./BaseConnector.js");
class MispConnector extends BaseConnector_js_1.BaseConnector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async fetchEvents(ctx, lastEventId) {
        return this.withResilience(async () => {
            // Mock implementation for the stub
            this.logger.info(`Fetching MISP events from ${this.config.baseUrl} (since: ${lastEventId || 'beginning'})`);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));
            return [
                {
                    id: '12345',
                    info: 'Emotet Campaign',
                    date: new Date().toISOString(),
                    threat_level_id: '1',
                    analysis: '2'
                }
            ];
        }, ctx);
    }
    async fetchAttributes(ctx, eventId) {
        return this.withResilience(async () => {
            this.logger.info(`Fetching attributes for event ${eventId}`);
            return [
                { type: 'ip-src', value: '1.2.3.4' },
                { type: 'domain', value: 'malicious.com' }
            ];
        }, ctx);
    }
}
exports.MispConnector = MispConnector;
