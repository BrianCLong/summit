import { promises as fs } from "fs";
import path from "path";
import { generateManifest } from "../generate.js";

describe("generateManifest", () => {
  const fixturesDir = path.resolve(__dirname, "fixtures");
  const manifestPath = path.join(fixturesDir, "manifest.json");

  afterEach(async () => {
    try {
      await fs.unlink(manifestPath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  });

  it("should generate a manifest for a given directory", async () => {
    const metadata = { test: "data" };
    const manifest = await generateManifest(fixturesDir, metadata);

    expect(manifest.version).toBe("1.0.0");
    expect(manifest.metadata).toEqual(metadata);
    expect(Object.keys(manifest.files)).toHaveLength(2);
    expect(manifest.files["file1.txt"]).toBeDefined();
    expect(manifest.files["file2.txt"]).toBeDefined();

    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifestJson = JSON.parse(manifestContent);
    expect(manifestJson).toEqual(manifest);
  });
});
