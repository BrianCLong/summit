"use strict";
// @ts-nocheck
/**
 * RSS Feed Collector - Monitors RSS/Atom feeds for news and updates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSFeedCollector = void 0;
const CollectorBase_js_1 = require("../core/CollectorBase.js");
const rss_parser_1 = __importDefault(require("rss-parser"));
class RSSFeedCollector extends CollectorBase_js_1.CollectorBase {
    parser;
    feedCache = new Map();
    constructor(config) {
        super(config);
        this.parser = new rss_parser_1.default({
            customFields: {
                item: ['media:content', 'media:thumbnail']
            }
        });
    }
    async onInitialize() {
        console.log(`Initializing ${this.config.name}`);
    }
    async performCollection(task) {
        const feedUrl = task.target;
        const since = this.feedCache.get(feedUrl);
        const items = await this.fetchFeed(feedUrl, since);
        this.feedCache.set(feedUrl, new Date());
        return items;
    }
    async onShutdown() {
        this.feedCache.clear();
    }
    countRecords(data) {
        if (Array.isArray(data)) {
            return data.length;
        }
        return 0;
    }
    /**
     * Fetch and parse RSS feed
     */
    async fetchFeed(url, since) {
        try {
            const feed = await this.parser.parseURL(url);
            let items = feed.items.map(item => ({
                title: item.title || '',
                link: item.link || '',
                pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
                author: item.creator || item.author,
                content: item.content,
                contentSnippet: item.contentSnippet,
                guid: item.guid,
                categories: item.categories,
                enclosure: item.enclosure
            }));
            // Filter by date if specified
            if (since) {
                items = items.filter(item => item.pubDate && item.pubDate > since);
            }
            return items;
        }
        catch (error) {
            throw new Error(`Failed to fetch RSS feed ${url}: ${error}`);
        }
    }
    /**
     * Monitor multiple feeds
     */
    async monitorFeeds(urls) {
        const results = new Map();
        await Promise.all(urls.map(async (url) => {
            try {
                const items = await this.fetchFeed(url);
                results.set(url, items);
            }
            catch (error) {
                console.error(`Error fetching feed ${url}:`, error);
                results.set(url, []);
            }
        }));
        return results;
    }
    /**
     * Search feed items by keyword
     */
    searchItems(items, keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return items.filter(item => item.title.toLowerCase().includes(lowerKeyword) ||
            item.contentSnippet?.toLowerCase().includes(lowerKeyword) ||
            item.content?.toLowerCase().includes(lowerKeyword));
    }
    /**
     * Get items by category
     */
    filterByCategory(items, category) {
        return items.filter(item => item.categories &&
            item.categories.some(cat => cat.toLowerCase().includes(category.toLowerCase())));
    }
}
exports.RSSFeedCollector = RSSFeedCollector;
