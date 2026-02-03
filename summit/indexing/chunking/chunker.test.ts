import { LineChunker } from "./chunker";
describe("LineChunker", () => {
  test("should chunk a file into lines", () => {
    const chunker = new LineChunker(2);
    const content = "line1\nline2\nline3";
    const chunks = chunker.chunk("test.js", content);
    expect(chunks.length).toBe(2);
    expect(chunks[0].start_line).toBe(1);
  });

  test("should produce different hashes for different content", () => {
    const chunker = new LineChunker(200);
    const chunks1 = chunker.chunk("a.js", "content 1");
    const chunks2 = chunker.chunk("a.js", "content 2");

    expect(chunks1[0].content_hash).not.toBe(chunks2[0].content_hash);
  });
});
