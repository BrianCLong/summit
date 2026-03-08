"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("./cache");
describe("EmbeddingCache", () => {
    test("should store and retrieve embeddings", () => {
        const cache = new cache_1.EmbeddingCache();
        const vec = [0.1, 0.2];
        cache.put("hash1", vec);
        expect(cache.get("hash1")).toBe(vec);
    });
});
