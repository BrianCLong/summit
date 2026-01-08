import { Ledger } from "../src/ledger";
import { Verifier } from "../src/verifier";
import fs from "fs";

const TEST_DIR = "./tmp/test-ledger";

describe("Ledger", () => {
  let ledger: Ledger;

  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    ledger = new Ledger({ dataDir: TEST_DIR, enabled: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test("should register evidence and create claim", () => {
    const evidence = ledger.registerEvidence({
      contentHash: "abc",
      licenseId: "MIT",
      source: "user",
      transforms: [],
    });
    expect(evidence.id).toBeDefined();

    const claim = ledger.createClaim({
      evidenceIds: [evidence.id],
      transformChainIds: [],
      text: "test claim",
    });
    expect(claim.id).toBeDefined();
    expect(claim.hash).toBeDefined();
  });

  test("should verify valid manifest", () => {
    const evidence = ledger.registerEvidence({
      contentHash: "abc",
      licenseId: "MIT",
      source: "user",
      transforms: [],
    });
    const claim = ledger.createClaim({
      evidenceIds: [evidence.id],
      transformChainIds: [],
      text: "test claim",
    });

    const manifest = ledger.generateManifest([claim.id]);
    const verification = Verifier.verifyManifest(manifest);
    expect(verification.valid).toBe(true);
  });

  test("should fail verification on tampered claim", () => {
    const evidence = ledger.registerEvidence({
      contentHash: "abc",
      licenseId: "MIT",
      source: "user",
      transforms: [],
    });
    const claim = ledger.createClaim({
      evidenceIds: [evidence.id],
      transformChainIds: [],
      text: "test claim",
    });

    const manifest = ledger.generateManifest([claim.id]);

    // Tamper
    if (manifest.claims.length > 0 && manifest.claims[0]) {
      manifest.claims[0].text = "tampered text";
    }

    const verification = Verifier.verifyManifest(manifest);
    expect(verification.valid).toBe(false);
    expect(verification.errors.length).toBeGreaterThan(0);
  });

  test("should fail verification on tampered merkle root", () => {
    const evidence = ledger.registerEvidence({
      contentHash: "abc",
      licenseId: "MIT",
      source: "user",
      transforms: [],
    });
    const claim = ledger.createClaim({
      evidenceIds: [evidence.id],
      transformChainIds: [],
      text: "test claim",
    });

    const manifest = ledger.generateManifest([claim.id]);

    // Tamper Root
    manifest.merkleRoot = "deadbeef";

    const verification = Verifier.verifyManifest(manifest);
    expect(verification.valid).toBe(false);
  });
});
