import { buildMerkleTree, diffMerkle } from "./merkle";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("Merkle Tree", () => {
  let tempDir: string;
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "merkle-test-"));
  });
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  test("should build a deterministic tree", () => {
    fs.writeFileSync(path.join(tempDir, "a.js"), "const a = 1;");
    fs.mkdirSync(path.join(tempDir, "sub"));
    fs.writeFileSync(path.join(tempDir, "sub", "b.js"), "const b = 2;");
    const tree1 = buildMerkleTree(tempDir, () => false);
    const tree2 = buildMerkleTree(tempDir, () => false);
    expect(tree1.hash).toBe(tree2.hash);
    expect(tree1.children?.length).toBe(2);
  });

  test("should detect additions in local tree", () => {
    fs.writeFileSync(path.join(tempDir, "a.js"), "const a = 1;");
    const treeOld = buildMerkleTree(tempDir, () => false);

    fs.writeFileSync(path.join(tempDir, "b.js"), "const b = 2;");
    const treeNew = buildMerkleTree(tempDir, () => false);

    const diff = diffMerkle(treeNew, treeOld);
    expect(diff).toContain("b.js");
  });
});
