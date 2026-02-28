import { describe, it, expect } from '@jest/globals';
import { RSSConnector } from '../../src/connectors/rss/index.js';

describe('RSSConnector', () => {
  it('should return ingested documents for provided sources', async () => {
    const connector = new RSSConnector();
    const sources = [{ url: 'https://example.com/rss', category: 'intel' }];
    const docs = await connector.ingest(sources);

    expect(docs).toHaveLength(1);
    expect(docs[0].source_url).toBe('https://example.com/rss');
  });
});
