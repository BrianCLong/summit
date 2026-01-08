#!/usr/bin/env node
/* eslint-disable no-console */
import { Verifier } from "./verifier";
import fs from "fs";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: prov-verify <manifest-file>");
  process.exit(1);
}

try {
  const content = fs.readFileSync(filePath, "utf-8");
  const manifest = JSON.parse(content);
  const result = Verifier.verifyManifest(manifest);

  if (result.valid) {
    console.log("✅ Manifest verified successfully.");
    process.exit(0);
  } else {
    console.error("❌ Manifest verification failed:");
    result.errors.forEach((e) => console.error(` - ${e}`));
    process.exit(1);
  }
} catch (error) {
  console.error("Failed to read or parse manifest:", error);
  process.exit(1);
}
