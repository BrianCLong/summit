"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rss_1 = require("../../../server/src/connectors/rss");
describe('RSSConnector', () => {
    it('should ingest from sources (stub)', async () => {
        const connector = new rss_1.RSSConnectorStub();
        const items = await connector.ingest([{ url: 'https://example.com/rss' }]);
        expect(items).toEqual([]);
    });
});
