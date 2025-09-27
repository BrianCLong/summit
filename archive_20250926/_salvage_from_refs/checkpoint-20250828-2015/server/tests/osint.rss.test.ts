import { RssConnector } from "../src/osint/connectors/RssConnector";

describe("RssConnector", () => {
  test("parse simple RSS", () => {
    const xml = `<?xml version="1.0"?><rss><channel><language>en</language><item><title>T</title><link>http://x</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item></channel></rss>`;
    const c = new RssConnector("s1", "http://x");
    const out = c.parse(xml);
    expect(out[0].title).toBe("T");
    expect(out[0].url).toBe("http://x");
    expect(out[0].language).toBe("en");
    expect(out[0].id).toHaveLength(64); // sha256
  });
});

