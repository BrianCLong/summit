import { computeSimilarityHash } from "./simhash";
import { MerkleNode } from "../interfaces";
describe("simhash", () => {
  test("should compute deterministic simhash", () => {
    const tree: MerkleNode = {
      path_token: ".",
      hash: "root",
      children: [
        { path_token: "a.js", hash: "hash-a" },
        { path_token: "b.js", hash: "hash-b" }
      ]
    };
    const hash1 = computeSimilarityHash(tree);
    const hash2 = computeSimilarityHash(tree);
    expect(hash1).toBe(hash2);
    expect(hash1).toContain("hash-a");
  });
});
