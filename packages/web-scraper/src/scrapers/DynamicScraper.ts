/**
 * Dynamic Scraper - JavaScript rendering with Playwright
 */

import type { BrowserPool } from '../core/BrowserPool.js';
import { ContentExtractor } from '../core/ContentExtractor.js';
import type { ScrapeResult, ScrapeOptions } from '../types/index.js';

export class DynamicScraper {
  private browserPool: BrowserPool;
  private extractor: ContentExtractor;

  constructor(browserPool: BrowserPool) {
    this.browserPool = browserPool;
    this.extractor = new ContentExtractor();
  }

  /**
   * Scrape a dynamic web page with JavaScript rendering
   */
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    const startTime = Date.now();
    const { browser, page } = await this.browserPool.createPage();

    try {
      // Set user agent
      if (options?.userAgent) {
        await page.setExtraHTTPHeaders({
          'User-Agent': options.userAgent
        });
      }

      // Set custom headers
      if (options?.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // Set cookies
      if (options?.cookies) {
        await page.context().addCookies(options.cookies);
      }

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: options?.timeout || 30000
      });

      // Wait for custom selector if specified
      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options?.waitForTimeout || 10000
        });
      }

      // Additional wait if specified
      if (options?.waitForTimeout) {
        await page.waitForTimeout(options.waitForTimeout);
      }

      // Get performance metrics
      const performanceData = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
          loadTime: perfData.loadEventEnd - perfData.fetchStart,
          firstContentfulPaint: 0
        };
      });

      // Get page content
      const html = await page.content();
      const text = this.extractor.extractText(html);
      const markdown = this.extractor.extractMarkdown(html);
      const metadata = this.extractor.extractMetadata(html, url);

      const result: ScrapeResult = {
        url,
        statusCode: response?.status() || 0,
        success: (response?.status() || 0) >= 200 && (response?.status() || 0) < 300,
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
          ...performanceData,
          loadTime: Date.now() - startTime
        }
      };

      if (options?.extractLinks) {
        result.links = this.extractor.extractLinks(html, url);
      }

      if (options?.extractImages) {
        result.images = this.extractor.extractImages(html, url);
      }

      if (options?.screenshot) {
        result.screenshot = await page.screenshot({ fullPage: true });
      }

      return result;
    } catch (error) {
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
    } finally {
      await this.browserPool.closePage(browser, page);
    }
  }
}
