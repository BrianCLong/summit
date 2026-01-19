#!/usr/bin/env node
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const evidenceDir = arg("--evidenceDir");
const cosignPubKey = arg("--cosignPubKey");
if (!evidenceDir || !cosignPubKey) {
  process.stderr.write("Usage: verify-cosign-signatures.mjs --evidenceDir <dir> --cosignPubKey <pem>\n");
  process.exit(2);
}

const spdx = join(evidenceDir, "sbom/sbom.spdx.json");
const cdx = join(evidenceDir, "sbom/sbom.cdx.json");
const spdxSig = join(evidenceDir, "signatures/sbom.spdx.sig");
const cdxSig = join(evidenceDir, "signatures/sbom.cdx.sig");

// If no signatures, treat as pass (policy workflow can enforce requirements later).
if (!existsSync(spdxSig) && !existsSync(cdxSig)) {
  process.stdout.write("No cosign signatures present; skipping verification.\n");
  process.exit(0);
}

if (!existsSync(spdxSig) || !existsSync(cdxSig)) {
  process.stderr.write("Partial signature set detected; failing verification.\n");
  process.exit(1);
}

// Write public key to a temporary file for cosign
const pubKeyFile = join(tmpdir(), `cosign-${Date.now()}.pub`);
writeFileSync(pubKeyFile, cosignPubKey, "utf8");

try {
  function verify(file, sig) {
    execFileSync("cosign", ["verify-blob", "--key", pubKeyFile, "--signature", sig, file], {
      stdio: "inherit",
    });
  }

  verify(spdx, spdxSig);
  verify(cdx, cdxSig);
  process.stdout.write("Cosign signature verification succeeded.\n");
} finally {
  if (existsSync(pubKeyFile)) {
    unlinkSync(pubKeyFile);
  }
}
