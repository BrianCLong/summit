/**
 * Ingestion stub for RSS and URL lists.
 */

export interface RSSSource {
  url: string;
  category: string;
}

export interface IngestedDocument {
  source_url: string;
  title: string;
  content: string;
  ingested_at: string;
}

export class RSSConnector {
  async ingest(sources: RSSSource[]): Promise<IngestedDocument[]> {
    console.log(`Ingesting ${sources.length} RSS sources...`);
    // Stub implementation
    return sources.map(s => ({
      source_url: s.url,
      title: "Stub Title",
      content: "Stub Content",
      ingested_at: new Date().toISOString()
    }));
  }
}
