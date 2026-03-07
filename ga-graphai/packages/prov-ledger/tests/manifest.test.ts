import { describe, expect, it } from "vitest";
import { createHash, generateKeyPairSync } from "node:crypto";
import type { LedgerEntry } from "common-types";
import { createExportManifest, verifyManifest, TransparencyLog } from "../src/manifest.js";

function buildLedgerEntries(): LedgerEntry[] {
  const timestamp = new Date("2024-01-01T00:00:00Z").toISOString();
  const first: LedgerEntry = {
    id: "evt-1",
    category: "ingest",
    actor: "collector",
    action: "register",
    resource: "rss-feed",
    payload: { url: "https://example.com/feed", checksum: "abc123" },
    timestamp,
    hash: "",
    previousHash: undefined,
  };
  first.hash = createHash("sha256")
    .update(first.id + JSON.stringify(first.payload))
    .digest("hex");
  const second: LedgerEntry = {
    id: "evt-2",
    category: "analysis",
    actor: "nlp-service",
    action: "extract",
    resource: "entity",
    payload: { entityId: "person-1", confidence: 0.92 },
    timestamp,
    hash: "",
    previousHash: first.hash,
  };
  second.hash = createHash("sha256")
    .update(second.id + JSON.stringify(second.payload) + second.previousHash)
    .digest("hex");
  return [first, second];
}

describe("export manifest", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const issuerPrivateKey = privateKey.export({ format: "pem", type: "pkcs1" }).toString();
  const issuerPublicKey = publicKey.export({ format: "pem", type: "pkcs1" }).toString();

  it("creates a manifest with deterministic merkle root", () => {
    const entries = buildLedgerEntries();
    const transparencyLog = new TransparencyLog(() => new Date("2024-01-02T00:00:00Z"));
    const manifest = createExportManifest({
      caseId: "case-42",
      ledger: entries,
      issuer: "issuer-1",
      keyId: "k1",
      privateKey: issuerPrivateKey,
      publicKey: issuerPublicKey,
      transparencyLog,
      now: () => new Date("2024-01-02T00:00:00Z"),
    });
    expect(manifest.caseId).toBe("case-42");
    expect(manifest.merkleRoot).toHaveLength(64);
    const verification = verifyManifest(manifest, entries, {
      evidence: {
        generatedAt: new Date().toISOString(),
        headHash: entries.at(-1)?.hash,
        entries,
      },
      transparencyLog,
    });
    expect(verification.valid).toBe(true);
    expect(verification.reasons).toHaveLength(0);
    expect(transparencyLog.list()).toHaveLength(1);
    expect(transparencyLog.verify(manifest)).toBe(true);
  });

  it("detects tampering when payload changes", () => {
    const entries = buildLedgerEntries().slice(0, 1);
    const transparencyLog = new TransparencyLog();
    const manifest = createExportManifest({
      caseId: "case-99",
      ledger: entries,
      privateKey: issuerPrivateKey,
      publicKey: issuerPublicKey,
    });
    manifest.transforms[0].payloadHash = "tampered";
    const verification = verifyManifest(manifest, entries, {
      publicKey: issuerPublicKey,
      transparencyLog,
    });
    expect(verification.valid).toBe(false);
    expect(verification.reasons).toContain("Payload hash mismatch for transform evt-1");
  });

  it("rejects manifests with invalid signatures", () => {
    const entries = buildLedgerEntries();
    const transparencyLog = new TransparencyLog();
    const manifest = createExportManifest({
      caseId: "case-12",
      ledger: entries,
      privateKey: issuerPrivateKey,
      publicKey: issuerPublicKey,
      transparencyLog,
    });
    manifest.signature.signature = "corrupted";
    const verification = verifyManifest(manifest, entries, { publicKey: issuerPublicKey });
    expect(verification.valid).toBe(false);
    expect(verification.reasons).toContain("Invalid issuer signature");
  });

  it("prevents snapshot replay with transparency log", () => {
    const entries = buildLedgerEntries();
    const transparencyLog = new TransparencyLog();
    const manifest = createExportManifest({
      caseId: "case-13",
      ledger: entries,
      snapshotId: "snap-1",
      privateKey: issuerPrivateKey,
      publicKey: issuerPublicKey,
      transparencyLog,
    });
    expect(transparencyLog.verify(manifest)).toBe(true);
    const tampered = { ...manifest, merkleRoot: "deadbeef" } as typeof manifest;
    expect(() => transparencyLog.record(tampered)).toThrow("Snapshot replay detected");
  });
});
