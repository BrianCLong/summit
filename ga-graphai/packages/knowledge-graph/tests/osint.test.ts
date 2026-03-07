import { describe, expect, it } from "vitest";
import { fetchOsintFeed, normalizeOsintRecords, parseRss } from "../src/osint.js";

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

describe("osint connector", () => {
  it("parses RSS items", () => {
    const items = parseRss(sampleRss);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Sample Item");
  });

  it("normalizes records with lineage and hashes", () => {
    const records = normalizeOsintRecords(
      {
        id: "rss-1",
        name: "Sample RSS",
        url: "https://example.com/rss.xml",
        type: "rss",
        consentRequired: false,
      },
      parseRss(sampleRss)
    );
    expect(records[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(records[0].lineage.profileId).toBe("rss-1");
  });

  it("fetches RSS feeds with retryable transport", async () => {
    const records = await fetchOsintFeed(
      {
        id: "rss-1",
        name: "Sample RSS",
        url: "https://example.com/rss.xml",
        type: "rss",
      },
      {
        fetchFn: async () =>
          ({
            ok: true,
            text: async () => sampleRss,
          }) as Response,
        maxRetries: 1,
      }
    );
    expect(records).toHaveLength(1);
    expect(records[0].link).toBe("https://example.com/item");
  });
});
