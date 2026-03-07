import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { signManifest, toCanonicalPath, verifyManifest } from "../src/index.js";

const fixturesRoot = path.join(process.cwd(), "tests", "fixtures");

test("accepts a valid manifest bundle", async () => {
  const bundlePath = path.join(fixturesRoot, "good-bundle");
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, true);
  assert.equal(report.issues.length, 0);
  assert.ok(report.filesChecked > 0);
});

test("flags missing files", async () => {
  const bundlePath = path.join(fixturesRoot, "missing-file-bundle");
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "MISSING_FILE"));
});

test("flags hash mismatches", async () => {
  const bundlePath = path.join(fixturesRoot, "hash-mismatch-bundle");
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "HASH_MISMATCH"));
});

test("detects broken transform chains", async () => {
  const bundlePath = path.join(fixturesRoot, "broken-transform-bundle");
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "TRANSFORM_BROKEN"));
});

test("path traversal safety property", () => {
  const root = "/tmp/bundle";
  for (let i = 0; i < 50; i += 1) {
    const token = crypto.randomBytes(4).toString("hex");
    const candidate = i % 2 === 0 ? `../${token}` : `/abs/${token}`;
    assert.throws(() => toCanonicalPath(root, candidate));
  }
});

test("verifies signed disclosure bundles", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prov-manifest-"));
  const manifest = {
    manifestVersion: "1.0.0",
    createdAt: new Date("2025-01-01T00:00:00Z").toISOString(),
    documents: [
      {
        id: "doc-1",
        path: "doc.txt",
        sha256: crypto.createHash("sha256").update("hello").digest("hex"),
      },
    ],
    disclosure: {
      audience: { policyId: "aud:public", label: "Public" },
      redactions: [
        {
          field: "email",
          path: "doc.txt",
          reason: "PII",
          appliedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
        },
      ],
      license: { id: "CC-BY-4.0", name: "Creative Commons BY 4.0" },
    },
  };
  fs.writeFileSync(path.join(tempDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(tempDir, "doc.txt"), "hello");

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const signatureFile = signManifest(manifest, {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    keyId: "test-key",
  });
  fs.writeFileSync(path.join(tempDir, "signature.json"), JSON.stringify(signatureFile, null, 2));

  const report = await verifyManifest(tempDir);
  assert.equal(report.valid, true);
  assert.equal(report.signature?.valid, true);
  assert.equal(report.disclosure?.licenseId, "CC-BY-4.0");
});
