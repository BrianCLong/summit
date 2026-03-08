"use strict";
/**
 * Browser Pool - Manages browser instances for dynamic scraping
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserPool = void 0;
const playwright_1 = require("playwright");
class BrowserPool {
    config;
    browsers = [];
    availableBrowsers = [];
    activeBrowsers = new Set();
    constructor(config) {
        this.config = {
            browserType: 'chromium',
            headless: true,
            ...config
        };
    }
    /**
     * Initialize the browser pool
     */
    async initialize() {
        // Pre-launch initial browsers
        const initialCount = Math.min(2, this.config.maxBrowsers);
        for (let i = 0; i < initialCount; i++) {
            const browser = await this.launchBrowser();
            this.browsers.push(browser);
            this.availableBrowsers.push(browser);
        }
    }
    /**
     * Get a browser from the pool
     */
    async acquire() {
        // If we have available browsers, use one
        if (this.availableBrowsers.length > 0) {
            const browser = this.availableBrowsers.pop();
            this.activeBrowsers.add(browser);
            return browser;
        }
        // If we can create more browsers, launch a new one
        if (this.browsers.length < this.config.maxBrowsers) {
            const browser = await this.launchBrowser();
            this.browsers.push(browser);
            this.activeBrowsers.add(browser);
            return browser;
        }
        // Wait for a browser to become available
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.availableBrowsers.length > 0) {
                    clearInterval(checkInterval);
                    const browser = this.availableBrowsers.pop();
                    this.activeBrowsers.add(browser);
                    resolve(browser);
                }
            }, 100);
        });
    }
    /**
     * Release a browser back to the pool
     */
    async release(browser) {
        this.activeBrowsers.delete(browser);
        this.availableBrowsers.push(browser);
    }
    /**
     * Create a new page from the pool
     */
    async createPage() {
        const browser = await this.acquire();
        const page = await browser.newPage();
        return { browser, page };
    }
    /**
     * Close a page and release browser
     */
    async closePage(browser, page) {
        await page.close();
        await this.release(browser);
    }
    /**
     * Shutdown the browser pool
     */
    async shutdown() {
        await Promise.all(this.browsers.map(browser => browser.close()));
        this.browsers = [];
        this.availableBrowsers = [];
        this.activeBrowsers.clear();
    }
    /**
     * Get active browser count
     */
    getActiveCount() {
        return this.activeBrowsers.size;
    }
    /**
     * Get max browsers
     */
    getMaxBrowsers() {
        return this.config.maxBrowsers;
    }
    /**
     * Launch a new browser instance
     */
    async launchBrowser() {
        const args = this.config.args || [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ];
        return await playwright_1.chromium.launch({
            headless: this.config.headless,
            args
        });
    }
}
exports.BrowserPool = BrowserPool;
