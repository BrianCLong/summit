/**
 * Scraper Engine - Main orchestrator for web scraping
 */

import { EventEmitter } from 'events';
import type { ScrapeTask, ScrapeResult, ScrapeOptions } from '../types/index.js';
import { StaticScraper } from '../scrapers/StaticScraper.js';
import { DynamicScraper } from '../scrapers/DynamicScraper.js';
import { ArchiveScraper } from '../scrapers/ArchiveScraper.js';
import { BrowserPool } from './BrowserPool.js';

export class ScraperEngine extends EventEmitter {
  private browserPool: BrowserPool;
  private staticScraper: StaticScraper;
  private dynamicScraper: DynamicScraper;
  private archiveScraper: ArchiveScraper;

  constructor() {
    super();
    this.browserPool = new BrowserPool({ maxBrowsers: 5 });
    this.staticScraper = new StaticScraper();
    this.dynamicScraper = new DynamicScraper(this.browserPool);
    this.archiveScraper = new ArchiveScraper();
  }

  /**
   * Initialize the scraper engine
   */
  async initialize(): Promise<void> {
    await this.browserPool.initialize();
    this.emit('initialized');
  }

  /**
   * Scrape a URL
   */
  async scrape(task: ScrapeTask): Promise<ScrapeResult> {
    this.emit('scrape:start', { taskId: task.id, url: task.url });
    const startTime = Date.now();

    try {
      let result: ScrapeResult;

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
    } catch (error) {
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
  async scrapeBatch(
    urls: string[],
    options?: ScrapeOptions
  ): Promise<ScrapeResult[]> {
    const tasks = urls.map((url, index) => ({
      id: `batch-${Date.now()}-${index}`,
      url,
      method: (options?.renderJavaScript ? 'dynamic' : 'static') as 'static' | 'dynamic',
      options
    }));

    return await Promise.all(tasks.map(task => this.scrape(task)));
  }

  /**
   * Shutdown the scraper engine
   */
  async shutdown(): Promise<void> {
    await this.browserPool.shutdown();
    this.emit('shutdown');
  }

  /**
   * Get engine status
   */
  getStatus(): {
    browsers: { active: number; max: number };
    scrapers: { static: boolean; dynamic: boolean; archive: boolean };
  } {
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
