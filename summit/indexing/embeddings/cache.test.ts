import { EmbeddingCache } from "./cache";
describe("EmbeddingCache", () => {
  test("should store and retrieve embeddings", () => {
    const cache = new EmbeddingCache();
    const vec = [0.1, 0.2];
    cache.put("hash1", vec);
    expect(cache.get("hash1")).toBe(vec);
  });
});
