"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const osint_js_1 = require("../src/osint.js");
const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss>
  <channel>
    <item>
      <title>Sample Item</title>
      <link>https://example.com/item</link>
      <description>Sample summary</description>
      <pubDate>Mon, 01 Jan 2025 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
(0, vitest_1.describe)('osint connector', () => {
    (0, vitest_1.it)('parses RSS items', () => {
        const items = (0, osint_js_1.parseRss)(sampleRss);
        (0, vitest_1.expect)(items).toHaveLength(1);
        (0, vitest_1.expect)(items[0].title).toBe('Sample Item');
    });
    (0, vitest_1.it)('normalizes records with lineage and hashes', () => {
        const records = (0, osint_js_1.normalizeOsintRecords)({
            id: 'rss-1',
            name: 'Sample RSS',
            url: 'https://example.com/rss.xml',
            type: 'rss',
            consentRequired: false,
        }, (0, osint_js_1.parseRss)(sampleRss));
        (0, vitest_1.expect)(records[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
        (0, vitest_1.expect)(records[0].lineage.profileId).toBe('rss-1');
    });
    (0, vitest_1.it)('fetches RSS feeds with retryable transport', async () => {
        const records = await (0, osint_js_1.fetchOsintFeed)({
            id: 'rss-1',
            name: 'Sample RSS',
            url: 'https://example.com/rss.xml',
            type: 'rss',
        }, {
            fetchFn: async () => ({
                ok: true,
                text: async () => sampleRss,
            }),
            maxRetries: 1,
        });
        (0, vitest_1.expect)(records).toHaveLength(1);
        (0, vitest_1.expect)(records[0].link).toBe('https://example.com/item');
    });
});
