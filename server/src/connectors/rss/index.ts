export interface RSSSource {
  url: string;
  category?: string;
}

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
}

export class RSSConnectorStub {
  async ingest(sources: RSSSource[]): Promise<RSSItem[]> {
    // Stub: No actual crawling by default per MASTER PLAN
    console.log(`Ingesting from ${sources.length} RSS sources (STUB)`);
    return [];
  }
}
