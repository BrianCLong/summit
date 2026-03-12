export interface RSSFeedItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  sourceUrl: string;
}

export interface RSSIngestOptions {
  urls: string[];
  limit?: number;
}

/**
 * Stub for RSS/URL list ingestion.
 * This does not perform real network requests but defines the expected interface.
 */
export class RSSConnector {
  async ingest(options: RSSIngestOptions): Promise<RSSFeedItem[]> {
    // Stub implementation: return empty array or handle synthetic fixtures in tests
    console.log(`Stub ingesting from ${options.urls.length} URLs`);
    return [];
  }
}
