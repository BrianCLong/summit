"use strict";
/**
 * Archive Scraper - Scrapes from Wayback Machine and archive.today
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveScraper = void 0;
const axios_1 = __importDefault(require("axios"));
const ContentExtractor_js_1 = require("../core/ContentExtractor.js");
class ArchiveScraper {
    extractor;
    waybackUrl = 'https://web.archive.org';
    archiveTodayUrl = 'https://archive.today';
    constructor() {
        this.extractor = new ContentExtractor_js_1.ContentExtractor();
    }
    /**
     * Scrape from Wayback Machine
     */
    async scrape(url, options) {
        const timestamp = options?.headers?.['archive-timestamp'] || '';
        return await this.scrapeWayback(url, timestamp);
    }
    /**
     * Get latest snapshot from Wayback Machine
     */
    async scrapeWayback(url, timestamp) {
        const startTime = Date.now();
        try {
            // Get latest snapshot
            const availabilityUrl = `${this.waybackUrl}/wayback/available?url=${encodeURIComponent(url)}`;
            const availabilityResponse = await axios_1.default.get(availabilityUrl);
            const snapshot = availabilityResponse.data?.archived_snapshots?.closest;
            if (!snapshot) {
                throw new Error('No archived snapshot found');
            }
            // Fetch the archived page
            const archiveUrl = snapshot.url;
            const response = await axios_1.default.get(archiveUrl);
            const html = response.data;
            const text = this.extractor.extractText(html);
            const markdown = this.extractor.extractMarkdown(html);
            const metadata = this.extractor.extractMetadata(html, url);
            return {
                url: archiveUrl,
                statusCode: response.status,
                success: true,
                timestamp: new Date(snapshot.timestamp),
                content: {
                    html,
                    text,
                    markdown,
                    title: metadata.title,
                    description: metadata.description
                },
                metadata: {
                    ...metadata,
                    canonical: url // Original URL
                },
                performance: {
                    loadTime: Date.now() - startTime,
                    domContentLoaded: Date.now() - startTime
                }
            };
        }
        catch (error) {
            return {
                url,
                statusCode: 0,
                success: false,
                timestamp: new Date(),
                content: {},
                error: error instanceof Error ? error.message : String(error),
                performance: {
                    loadTime: Date.now() - startTime,
                    domContentLoaded: 0
                }
            };
        }
    }
    /**
     * Get all available snapshots for a URL
     */
    async getSnapshots(url) {
        try {
            const cdxUrl = `${this.waybackUrl}/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json`;
            const response = await axios_1.default.get(cdxUrl);
            const data = response.data;
            // Skip header row
            return data.slice(1).map((row) => ({
                timestamp: new Date(`${row[1].substring(0, 4)}-${row[1].substring(4, 6)}-${row[1].substring(6, 8)}`),
                url: `${this.waybackUrl}/web/${row[1]}/${row[2]}`
            }));
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Save a URL to Wayback Machine
     */
    async saveToWayback(url) {
        try {
            const saveUrl = `${this.waybackUrl}/save/${url}`;
            const response = await axios_1.default.get(saveUrl);
            return {
                success: true,
                archiveUrl: response.headers['content-location']
            };
        }
        catch (error) {
            return { success: false };
        }
    }
}
exports.ArchiveScraper = ArchiveScraper;
