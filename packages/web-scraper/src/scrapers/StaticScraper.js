"use strict";
/**
 * Static Scraper - Fast scraping for static HTML pages
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticScraper = void 0;
const axios_1 = __importDefault(require("axios"));
const ContentExtractor_js_1 = require("../core/ContentExtractor.js");
class StaticScraper {
    extractor;
    constructor() {
        this.extractor = new ContentExtractor_js_1.ContentExtractor();
    }
    /**
     * Scrape a static web page
     */
    async scrape(url, options) {
        const startTime = Date.now();
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': options?.userAgent || 'Mozilla/5.0 (compatible; IntelGraphOSINT/1.0)',
                    ...options?.headers
                },
                timeout: options?.timeout || 30000,
                maxRedirects: 5,
                validateStatus: () => true // Accept all status codes
            });
            const html = response.data;
            const text = this.extractor.extractText(html);
            const markdown = this.extractor.extractMarkdown(html);
            const metadata = this.extractor.extractMetadata(html, url);
            const result = {
                url,
                statusCode: response.status,
                success: response.status >= 200 && response.status < 300,
                timestamp: new Date(),
                content: {
                    html,
                    text,
                    markdown,
                    title: metadata.title,
                    description: metadata.description
                },
                metadata,
                performance: {
                    loadTime: Date.now() - startTime,
                    domContentLoaded: Date.now() - startTime
                }
            };
            if (options?.extractLinks) {
                result.links = this.extractor.extractLinks(html, url);
            }
            if (options?.extractImages) {
                result.images = this.extractor.extractImages(html, url);
            }
            return result;
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
}
exports.StaticScraper = StaticScraper;
