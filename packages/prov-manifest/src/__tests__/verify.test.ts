import { promises as fs } from "fs";
import path from "path";
import { generateManifest } from "../generate.js";
import { verifyManifest } from "../verify.js";
import { Manifest } from "../schema.js";

describe("verifyManifest", () => {
  const fixturesDir = path.resolve(__dirname, "fixtures");
  const manifestPath = path.join(fixturesDir, "manifest.json");

  beforeEach(async () => {
    await generateManifest(fixturesDir, { test: "data" });
  });

  afterEach(async () => {
    try {
      await fs.unlink(manifestPath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  });

  it("should successfully verify a valid manifest", async () => {
    const result = await verifyManifest(manifestPath, fixturesDir);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail if the manifest file is not found", async () => {
    const result = await verifyManifest("nonexistent-manifest.json", fixturesDir);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("Manifest file not found at nonexistent-manifest.json");
  });

  it("should fail if a file is missing", async () => {
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest: Manifest = JSON.parse(manifestContent);
    manifest.files["nonexistent-file.txt"] = { hash: "123", size: 123 };
    await fs.writeFile(manifestPath, JSON.stringify(manifest));

    const result = await verifyManifest(manifestPath, fixturesDir);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("File not found: nonexistent-file.txt");
  });

  it("should fail if a file hash is incorrect", async () => {
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest: Manifest = JSON.parse(manifestContent);
    if (manifest.files["file1.txt"]) {
      manifest.files["file1.txt"].hash = "incorrect-hash";
    }
    await fs.writeFile(manifestPath, JSON.stringify(manifest));

    const result = await verifyManifest(manifestPath, fixturesDir);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatch(/Hash mismatch for file: file1.txt/);
  });
});
