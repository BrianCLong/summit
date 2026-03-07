import { writeFileSync, mkdtempSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import test from "node:test";
import assert from "node:assert";
import { verifyManifest } from "../src/verifyManifest.js";

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

const createTempBundle = (manifestContent) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "prov-manifest-"));
  writeFileSync(path.join(dir, "manifest.json"), manifestContent);
  return dir;
};

test("accepts a fully valid bundle", async () => {
  const bundle = path.join(fixtures, "valid-bundle");
  const report = await verifyManifest(bundle);
  assert.equal(report.valid, true);
  assert.equal(report.checkedFiles, 3);
  assert.deepEqual(report.issues, []);
});

test("detects hash mismatches and transform chain failures", async () => {
  const bundle = path.join(fixtures, "hash-mismatch");
  const report = await verifyManifest(bundle);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "hash-mismatch"));
  assert.ok(report.issues.some((issue) => issue.code === "transform-link-broken"));
});

test("flags missing files", async () => {
  const bundle = path.join(fixtures, "missing-file");
  const report = await verifyManifest(bundle);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "missing-file"));
});

test("rejects path traversal attempts", async () => {
  const bundle = path.join(fixtures, "path-traversal");
  const report = await verifyManifest(bundle);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "path-traversal"));
});

test("guards against path traversal with randomized prefixes", async () => {
  for (let i = 0; i < 10; i += 1) {
    const prefix = randomBytes(2).toString("hex");
    const unsafePath = `../${prefix}/evil.txt`;
    const manifest = {
      manifestVersion: "1.0",
      bundleId: "prop",
      generatedAt: "2024-01-01T00:00:00Z",
      assets: [{ id: "a", path: unsafePath, sha256: "a".repeat(64) }],
    };
    const dir = createTempBundle(JSON.stringify(manifest));
    const report = await verifyManifest(dir);
    assert.equal(report.valid, false);
    assert.ok(report.issues.some((issue) => issue.code === "path-traversal"));
  }
});

test("reports schema violations", async () => {
  const dir = createTempBundle(
    '{"manifestVersion":"1.0","bundleId":"broken","generatedAt":"2024-01-01T00:00:00Z"}'
  );
  const report = await verifyManifest(dir);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "schema-invalid"));
});
