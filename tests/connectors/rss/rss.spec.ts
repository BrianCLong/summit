import { RSSConnectorStub } from '../../../server/src/connectors/rss';

describe('RSSConnector', () => {
  it('should ingest from sources (stub)', async () => {
    const connector = new RSSConnectorStub();
    const items = await connector.ingest([{ url: 'https://example.com/rss' }]);
    expect(items).toEqual([]);
  });
});
