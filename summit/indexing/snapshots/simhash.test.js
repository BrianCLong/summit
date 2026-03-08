"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const simhash_1 = require("./simhash");
describe("simhash", () => {
    test("should compute deterministic simhash", () => {
        const tree = {
            path_token: ".",
            hash: "root",
            children: [
                { path_token: "a.js", hash: "hash-a" },
                { path_token: "b.js", hash: "hash-b" }
            ]
        };
        const hash1 = (0, simhash_1.computeSimilarityHash)(tree);
        const hash2 = (0, simhash_1.computeSimilarityHash)(tree);
        expect(hash1).toBe(hash2);
        expect(hash1).toContain("hash-a");
    });
});
