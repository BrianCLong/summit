/**
 * Archive Scraper - Scrapes from Wayback Machine and archive.today
 */

import axios from 'axios';
import { ContentExtractor } from '../core/ContentExtractor.js';
import type { ScrapeResult, ScrapeOptions } from '../types/index.js';

export class ArchiveScraper {
  private extractor: ContentExtractor;
  private waybackUrl = 'https://web.archive.org';
  private archiveTodayUrl = 'https://archive.today';

  constructor() {
    this.extractor = new ContentExtractor();
  }

  /**
   * Scrape from Wayback Machine
   */
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    const timestamp = options?.headers?.['archive-timestamp'] || '';
    return await this.scrapeWayback(url, timestamp);
  }

  /**
   * Get latest snapshot from Wayback Machine
   */
  async scrapeWayback(url: string, timestamp?: string): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
      // Get latest snapshot
      const availabilityUrl = `${this.waybackUrl}/wayback/available?url=${encodeURIComponent(url)}`;
      const availabilityResponse = await axios.get(availabilityUrl);

      const snapshot = availabilityResponse.data?.archived_snapshots?.closest;
      if (!snapshot) {
        throw new Error('No archived snapshot found');
      }

      // Fetch the archived page
      const archiveUrl = snapshot.url;
      const response = await axios.get(archiveUrl);
      const html = response.data;

      const text = this.extractor.extractText(html);
      const markdown = this.extractor.extractMarkdown(html);
      const metadata = this.extractor.extractMetadata(html, url);

      return {
        url: archiveUrl,
        statusCode: response.status,
        success: true,
        timestamp: new Date(snapshot.timestamp),
        content: {
          html,
          text,
          markdown,
          title: metadata.title,
          description: metadata.description
        },
        metadata: {
          ...metadata,
          canonical: url // Original URL
        },
        performance: {
          loadTime: Date.now() - startTime,
          domContentLoaded: Date.now() - startTime
        }
      };
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

  /**
   * Get all available snapshots for a URL
   */
  async getSnapshots(url: string): Promise<Array<{
    timestamp: Date;
    url: string;
  }>> {
    try {
      const cdxUrl = `${this.waybackUrl}/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json`;
      const response = await axios.get(cdxUrl);
      const data = response.data;

      // Skip header row
      return data.slice(1).map((row: any[]) => ({
        timestamp: new Date(
          `${row[1].substring(0, 4)}-${row[1].substring(4, 6)}-${row[1].substring(6, 8)}`
        ),
        url: `${this.waybackUrl}/web/${row[1]}/${row[2]}`
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Save a URL to Wayback Machine
   */
  async saveToWayback(url: string): Promise<{ success: boolean; archiveUrl?: string }> {
    try {
      const saveUrl = `${this.waybackUrl}/save/${url}`;
      const response = await axios.get(saveUrl);

      return {
        success: true,
        archiveUrl: response.headers['content-location']
      };
    } catch (error) {
      return { success: false };
    }
  }
}
