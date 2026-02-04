/**
 * Web Scraper Collector - Basic web scraping (detailed scraping in web-scraper package)
 */

import { CollectorBase } from '../core/CollectorBase.js';
import type { CollectionTask } from '../types/index.js';

export class WebScraperCollector extends CollectorBase {
  protected async onInitialize(): Promise<void> {
    console.log(`Initializing ${this.config.name}`);
  }

  protected async performCollection(task: CollectionTask): Promise<unknown> {
    // Basic scraping - advanced scraping delegated to web-scraper package
    return { url: task.target, status: 'pending_advanced_scraping' };
  }

  protected async onShutdown(): Promise<void> {
    // Cleanup
  }

  protected countRecords(data: unknown): number {
    return 1;
  }
}
