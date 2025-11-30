/**
 * Static Scraper - Fast scraping for static HTML pages
 */

import axios from 'axios';
import { ContentExtractor } from '../core/ContentExtractor.js';
import type { ScrapeResult, ScrapeOptions } from '../types/index.js';

export class StaticScraper {
  private extractor: ContentExtractor;

  constructor() {
    this.extractor = new ContentExtractor();
  }

  /**
   * Scrape a static web page
   */
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      const response = await axios.get(url, {
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

      const result: ScrapeResult = {
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
    }
  }
}
