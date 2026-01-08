import { buildMerkleRoot, hashLeaf } from "../src/hash.js";

describe("hash utilities", () => {
  it("builds deterministic merkle roots", () => {
    const leaves = [
      hashLeaf("evidence-1", "hash-a"),
      hashLeaf("evidence-2", "hash-b"),
      hashLeaf("evidence-3", "hash-c"),
    ];

    const { root } = buildMerkleRoot(leaves);

    expect(root).toBe("6051f0bf0f3c7c5b2531731f22a8633a3fe6b3d8a09f8914d565a2379b9073ab");
  });

  it("handles a single leaf", () => {
    const { root } = buildMerkleRoot([hashLeaf("only", "abc")]);
    expect(root).toBe(hashLeaf("only", "abc"));
  });
});
