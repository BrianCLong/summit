import { describe, it, expect } from 'vitest';
import { parseRSSItems, RSSItem } from "../../src/connectors/rss/index";

describe("RSS Ingestion Connector", () => {
  it("should parse RSS items into Summit-compatible documents", () => {
    const items: RSSItem[] = [
      {
        id: "1",
        title: "Test Item",
        link: "https://example.com/test",
        pubDate: "2026-01-01T00:00:00Z",
        author: "Author 1",
        contentSnippet: "Test content",
        sourceId: "source-1"
      }
    ];

    const parsed = parseRSSItems(items);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("DOCUMENT");
    expect(parsed[0].id).toBe("1");
    expect(parsed[0].url).toBe("https://example.com/test");
    expect(parsed[0].metadata.author).toBe("Author 1");
  });

  it("should handle empty items", () => {
    const parsed = parseRSSItems([]);
    expect(parsed).toHaveLength(0);
  });
});
