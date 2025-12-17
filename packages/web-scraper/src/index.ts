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

export * from './core/ScraperEngine.js';
export * from './core/BrowserPool.js';
export * from './core/ChangeDetector.js';
export * from './core/ContentExtractor.js';

export * from './scrapers/StaticScraper.js';
export * from './scrapers/DynamicScraper.js';
export * from './scrapers/ArchiveScraper.js';

export * from './analyzers/TechnologyDetector.js';
export * from './analyzers/LinkAnalyzer.js';
export * from './analyzers/MetadataExtractor.js';

export * from './types/index.js';
export * from './utils/index.js';
