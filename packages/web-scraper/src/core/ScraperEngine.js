"use strict";
/**
 * Scraper Engine - Main orchestrator for web scraping
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperEngine = void 0;
const events_1 = require("events");
const StaticScraper_js_1 = require("../scrapers/StaticScraper.js");
const DynamicScraper_js_1 = require("../scrapers/DynamicScraper.js");
const ArchiveScraper_js_1 = require("../scrapers/ArchiveScraper.js");
const BrowserPool_js_1 = require("./BrowserPool.js");
class ScraperEngine extends events_1.EventEmitter {
    browserPool;
    staticScraper;
    dynamicScraper;
    archiveScraper;
    constructor() {
        super();
        this.browserPool = new BrowserPool_js_1.BrowserPool({ maxBrowsers: 5 });
        this.staticScraper = new StaticScraper_js_1.StaticScraper();
        this.dynamicScraper = new DynamicScraper_js_1.DynamicScraper(this.browserPool);
        this.archiveScraper = new ArchiveScraper_js_1.ArchiveScraper();
    }
    /**
     * Initialize the scraper engine
     */
    async initialize() {
        await this.browserPool.initialize();
        this.emit('initialized');
    }
    /**
     * Scrape a URL
     */
    async scrape(task) {
        this.emit('scrape:start', { taskId: task.id, url: task.url });
        const startTime = Date.now();
        try {
            let result;
            switch (task.method) {
                case 'static':
                    result = await this.staticScraper.scrape(task.url, task.options);
                    break;
                case 'dynamic':
                    result = await this.dynamicScraper.scrape(task.url, task.options);
                    break;
                case 'archive':
                    result = await this.archiveScraper.scrape(task.url, task.options);
                    break;
                default:
                    throw new Error(`Unknown scrape method: ${task.method}`);
            }
            result.performance = {
                ...result.performance,
                loadTime: Date.now() - startTime
            };
            this.emit('scrape:complete', { taskId: task.id, result });
            return result;
        }
        catch (error) {
            this.emit('scrape:error', {
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Scrape multiple URLs in batch
     */
    async scrapeBatch(urls, options) {
        const tasks = urls.map((url, index) => ({
            id: `batch-${Date.now()}-${index}`,
            url,
            method: (options?.renderJavaScript ? 'dynamic' : 'static'),
            options
        }));
        return await Promise.all(tasks.map(task => this.scrape(task)));
    }
    /**
     * Shutdown the scraper engine
     */
    async shutdown() {
        await this.browserPool.shutdown();
        this.emit('shutdown');
    }
    /**
     * Get engine status
     */
    getStatus() {
        return {
            browsers: {
                active: this.browserPool.getActiveCount(),
                max: this.browserPool.getMaxBrowsers()
            },
            scrapers: {
                static: true,
                dynamic: true,
                archive: true
            }
        };
    }
}
exports.ScraperEngine = ScraperEngine;
