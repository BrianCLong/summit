import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import {
  parseReleaseStatus,
  parseBundleIndex,
  parseReleaseManifest,
  checkCompatibility,
  loadBundleFromDir,
} from "../index.js";

// Since we are running compiled JS from dist/, fixtures are relative to project root or we need to resolve them carefully
// But in standard node setup, if we run `node --test dist/__tests__/*.test.js`, process.cwd() is usually package root.
const FIXTURES_DIR = path.resolve("fixtures");

test("parseReleaseStatus happy path", () => {
  const status = parseReleaseStatus({ status: "ready" });
  assert.strictEqual(status, "ready");

  const statusRaw = parseReleaseStatus("draft");
  assert.strictEqual(statusRaw, "draft");
});

test("parseReleaseStatus failure path", () => {
  assert.throws(() => parseReleaseStatus({ status: "unknown" }));
  assert.throws(() => parseReleaseStatus("invalid"));
});

test("parseBundleIndex happy path", () => {
  const index = parseBundleIndex({
    schemaVersion: "1.0",
    entries: { "file.txt": "sha256:123" },
  });
  assert.strictEqual(index.schemaVersion, "1.0");
  assert.strictEqual(index.entries["file.txt"], "sha256:123");
});

test("checkCompatibility enforces major version", () => {
  const v1Manifest = {
    schemaVersion: "1.0",
    name: "test",
    version: "1.0.0",
    majorVersion: 1,
  };

  assert.strictEqual(checkCompatibility({ manifest: v1Manifest }, 1).compatible, true);

  const v2Manifest = {
    ...v1Manifest,
    version: "2.0.0",
    majorVersion: 2,
  };

  const result = checkCompatibility({ manifest: v2Manifest }, 1);
  assert.strictEqual(result.compatible, false);
  if (!result.compatible) {
    assert.match(result.reason, /does not match/);
  }
});

test("loadBundleFromDir loads fixtures", async () => {
  // We expect fixtures to be present in packages/release-bundle/fixtures/
  // and we are running this test presumably from packages/release-bundle/

  const bundle = await loadBundleFromDir(FIXTURES_DIR);

  assert.ok(bundle.status, "Should load status");
  assert.strictEqual(bundle.status, "ready");

  assert.ok(bundle.index, "Should load index");
  assert.strictEqual(bundle.index?.schemaVersion, "1.0.0");

  assert.ok(bundle.manifest, "Should load manifest");
  assert.strictEqual(bundle.manifest?.name, "test-bundle");

  assert.ok(bundle.provenance, "Should load provenance");
});
