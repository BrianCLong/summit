"use strict";
/**
 * Web Scraper Collector - Basic web scraping (detailed scraping in web-scraper package)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebScraperCollector = void 0;
const CollectorBase_js_1 = require("../core/CollectorBase.js");
class WebScraperCollector extends CollectorBase_js_1.CollectorBase {
    async onInitialize() {
        console.log(`Initializing ${this.config.name}`);
    }
    async performCollection(task) {
        // Basic scraping - advanced scraping delegated to web-scraper package
        return { url: task.target, status: 'pending_advanced_scraping' };
    }
    async onShutdown() {
        // Cleanup
    }
    countRecords(data) {
        return 1;
    }
}
exports.WebScraperCollector = WebScraperCollector;
