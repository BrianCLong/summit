/**
 * RSS Ingestion Stub for INFOWAR subsumption.
 */

export interface RSSFeedSource {
  id: string;
  url: string;
  category: "news" | "blog" | "government";
  lastFetched?: Date;
}

export interface RSSItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  author: string;
  contentSnippet: string;
  sourceId: string;
}

/**
 * Mocks an RSS fetch for a given source.
 * No external network calls are made in this stub.
 */
export async function fetchRSSItems(source: RSSFeedSource): Promise<RSSItem[]> {
  // Stub implementation for now
  console.log(`Stub: Fetching RSS items from ${source.url}`);
  return [];
}

/**
 * Parses raw RSS items into Summit-compatible source documents.
 */
export function parseRSSItems(items: RSSItem[]): any[] {
  return items.map(item => ({
    type: "DOCUMENT",
    source: "RSS",
    id: item.id,
    title: item.title,
    url: item.link,
    timestamp: item.pubDate,
    content: item.contentSnippet,
    metadata: {
      author: item.author,
      source_id: item.sourceId
    }
  }));
}
