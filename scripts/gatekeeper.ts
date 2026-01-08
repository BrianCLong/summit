#!/usr/bin/env node

import { ArtifactVerifier } from "../server/src/lib/deployment/admission-control";

// Simple CLI wrapper
async function main() {
  const imageRef = process.argv[2];
  if (!imageRef) {
    console.error("Usage: verify-admission <image-ref>");
    process.exit(1);
  }

  const verifier = new ArtifactVerifier();
  const result = await verifier.verify(imageRef);

  if (!result.allowed) {
    console.error(`\n⛔ DEPLOYMENT BLOCKED: ${result.reason}`);
    process.exit(1);
  }

  console.log(`\n✅ DEPLOYMENT APPROVED: ${result.reason}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
