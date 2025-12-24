import { IngestConnector, ResourceDefinition, IngestRecord, Checkpoint } from '@intelgraph/ingest-connector-sdk';
import Parser from 'rss-parser';

export class RssConnector implements IngestConnector<any, any> {
  private parser = new Parser();

  async discover(): Promise<ResourceDefinition[]> {
    return [
      { id: 'rss-1', name: 'TechCrunch', type: 'rss', metadata: { url: 'https://techcrunch.com/feed/' } }
    ];
  }

  async *pull(resource: ResourceDefinition, state?: any): AsyncGenerator<IngestRecord, void, unknown> {
    if (!resource.metadata?.url) return;
    try {
      const feed = await this.parser.parseURL(resource.metadata.url as string);
      for (const item of feed.items) {
        yield {
          id: item.guid || item.link || 'unknown',
          data: item,
          extractedAt: new Date()
        };
      }
    } catch (e) {
      console.error('RSS fetch failed', e);
    }
  }

  async ack(checkpoint: Checkpoint): Promise<void> {
    // No-op for RSS usually
  }

  async checkpoint(state: any): Promise<Checkpoint> {
    return {
      resourceId: 'rss-1',
      cursor: Date.now().toString(),
      timestamp: Date.now()
    };
  }
}
