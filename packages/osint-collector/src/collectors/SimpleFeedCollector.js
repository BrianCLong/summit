/**
 * Simple Feed Collector - Ingests line-delimited feeds (e.g. IPs, domains)
 */
import { CollectorBase } from '../core/CollectorBase.js';
import { CollectionType } from '../types/index.js';
import { validateSafeUrl } from '../utils/security.js';
export class SimpleFeedCollector extends CollectorBase {
    constructor(config) {
        super({
            ...config,
            type: CollectionType.WEB_SCRAPING // Closest fit
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
            await validateSafeUrl(url);
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
//# sourceMappingURL=SimpleFeedCollector.js.map