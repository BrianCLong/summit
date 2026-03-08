"use strict";
/**
 * Web Scraper - Advanced web scraping with JavaScript rendering
 *
 * Features:
 * - JavaScript rendering with Puppeteer/Playwright
 * - Change detection and monitoring
 * - Content extraction and parsing
 * - Technology fingerprinting
 * - Automated CAPTCHA handling
 * - Robots.txt compliance
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./core/ScraperEngine.js"), exports);
__exportStar(require("./core/BrowserPool.js"), exports);
__exportStar(require("./core/ChangeDetector.js"), exports);
__exportStar(require("./core/ContentExtractor.js"), exports);
__exportStar(require("./scrapers/StaticScraper.js"), exports);
__exportStar(require("./scrapers/DynamicScraper.js"), exports);
__exportStar(require("./scrapers/ArchiveScraper.js"), exports);
__exportStar(require("./analyzers/TechnologyDetector.js"), exports);
__exportStar(require("./analyzers/LinkAnalyzer.js"), exports);
__exportStar(require("./analyzers/MetadataExtractor.js"), exports);
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./utils/index.js"), exports);
