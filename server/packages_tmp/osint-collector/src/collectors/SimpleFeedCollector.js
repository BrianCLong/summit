"use strict";
/**
 * Simple Feed Collector - Ingests line-delimited feeds (e.g. IPs, domains)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleFeedCollector = void 0;
const CollectorBase_js_1 = require("../core/CollectorBase.js");
const index_js_1 = require("../types/index.js");
const security_js_1 = require("../utils/security.js");
class SimpleFeedCollector extends CollectorBase_js_1.CollectorBase {
    constructor(config) {
        super({
            ...config,
            type: index_js_1.CollectionType.WEB_SCRAPING // Closest fit
        });
    }
    async onInitialize() {
        console.log(`[SimpleFeedCollector] Initialized ${this.config.name}`);
    }
    async performCollection(task) {
        const url = task.config?.url || this.config.feedUrl;
        if (!url || typeof url !== 'string') {
            throw new Error('No feed URL provided in task config or collector config');
        }
        console.log(`[SimpleFeedCollector] Fetching feed from ${url}`);
        try {
            await (0, security_js_1.validateSafeUrl)(url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
            }
            const text = await response.text();
            // Process the data
            const lines = text.split('\n');
            const iocs = lines
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            return iocs.map(ioc => ({
                type: 'ip', // Simplified assumption for MVP
                value: ioc,
                source: url,
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            console.error(`[SimpleFeedCollector] Error fetching feed:`, error);
            throw error;
        }
    }
    async onShutdown() {
        console.log(`[SimpleFeedCollector] Shutting down ${this.config.name}`);
    }
    countRecords(data) {
        if (Array.isArray(data)) {
            return data.length;
        }
        return 0;
    }
}
exports.SimpleFeedCollector = SimpleFeedCollector;
