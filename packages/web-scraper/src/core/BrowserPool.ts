/**
 * Browser Pool - Manages browser instances for dynamic scraping
 */

import { Browser, Page, chromium } from 'playwright';

export interface BrowserPoolConfig {
  maxBrowsers: number;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  args?: string[];
}

export class BrowserPool {
  private config: BrowserPoolConfig;
  private browsers: Browser[] = [];
  private availableBrowsers: Browser[] = [];
  private activeBrowsers: Set<Browser> = new Set();

  constructor(config: BrowserPoolConfig) {
    this.config = {
      browserType: 'chromium',
      headless: true,
      ...config
    };
  }

  /**
   * Initialize the browser pool
   */
  async initialize(): Promise<void> {
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
  async acquire(): Promise<Browser> {
    // If we have available browsers, use one
    if (this.availableBrowsers.length > 0) {
      const browser = this.availableBrowsers.pop()!;
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
          const browser = this.availableBrowsers.pop()!;
          this.activeBrowsers.add(browser);
          resolve(browser);
        }
      }, 100);
    });
  }

  /**
   * Release a browser back to the pool
   */
  async release(browser: Browser): Promise<void> {
    this.activeBrowsers.delete(browser);
    this.availableBrowsers.push(browser);
  }

  /**
   * Create a new page from the pool
   */
  async createPage(): Promise<{ browser: Browser; page: Page }> {
    const browser = await this.acquire();
    const page = await browser.newPage();
    return { browser, page };
  }

  /**
   * Close a page and release browser
   */
  async closePage(browser: Browser, page: Page): Promise<void> {
    await page.close();
    await this.release(browser);
  }

  /**
   * Shutdown the browser pool
   */
  async shutdown(): Promise<void> {
    await Promise.all(this.browsers.map(browser => browser.close()));
    this.browsers = [];
    this.availableBrowsers = [];
    this.activeBrowsers.clear();
  }

  /**
   * Get active browser count
   */
  getActiveCount(): number {
    return this.activeBrowsers.size;
  }

  /**
   * Get max browsers
   */
  getMaxBrowsers(): number {
    return this.config.maxBrowsers;
  }

  /**
   * Launch a new browser instance
   */
  private async launchBrowser(): Promise<Browser> {
    const args = this.config.args || [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ];

    return await chromium.launch({
      headless: this.config.headless,
      args
    });
  }
}
