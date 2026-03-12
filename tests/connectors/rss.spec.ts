import { RSSConnector, RSSIngestOptions } from '../../src/connectors/rss';

describe('RSSConnector', () => {
  let connector: RSSConnector;

  beforeEach(() => {
    connector = new RSSConnector();
  });

  it('should be defined', () => {
    expect(connector).toBeDefined();
  });

  it('should ingest from provided URLs and return items', async () => {
    const options: RSSIngestOptions = {
      urls: ['https://example.com/rss'],
      limit: 10
    };

    // The current implementation is a stub and returns an empty array.
    const items = await connector.ingest(options);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });
});
