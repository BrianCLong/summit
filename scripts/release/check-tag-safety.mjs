#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";

// --- Configuration & Arguments ---
const options = {
  tag: { type: "string" },
  sha: { type: "string" },
  enforce: { type: "boolean", default: false },
  "require-annotated": { type: "boolean", default: false },
  "require-signed": { type: "boolean", default: false },
  help: { type: "boolean", default: false },
};

// Handle --help manually if parseArgs throws or just check after
try {
  var { values } = parseArgs({ options, strict: false });
} catch (e) {
  if (process.argv.includes("--help")) {
    values = { help: true };
  } else {
    throw e;
  }
}

if (values.help) {
  console.log(`
Usage: node check-tag-safety.mjs --tag <tag> [options]

Options:
  --tag <tag>               The git tag to check (required)
  --sha <sha>               The commit SHA the tag points to (optional, resolved if missing)
  --enforce                 Enable enforcement of safety checks (default: false)
  --require-annotated       Require the tag to be annotated (default: false)
  --require-signed          Require the tag to be signed (default: false)
  --help                    Show this help message
`);
  process.exit(0);
}

if (!values.tag) {
  console.error("❌ Error: --tag <tag> is required.");
  process.exit(1);
}

const runSilent = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch (e) {
    return null;
  }
};

function main() {
  const DIST_RELEASE = resolve("dist/release");
  const OUTPUT_FILE = resolve(DIST_RELEASE, "tag-safety.json");

  console.log(`🔍 Checking tag safety for: ${values.tag}`);

  // 1. Resolve Tag Object
  // Check if tag exists
  const tagType = runSilent(`git cat-file -t "${values.tag}"`);

  if (!tagType) {
    console.error(`❌ Tag '${values.tag}' not found.`);
    process.exit(1);
  }

  const isAnnotated = tagType === "tag";
  const resolvedSha = values.sha || runSilent(`git rev-list -n 1 "${values.tag}"`);

  let tagSafety = {
    schemaVersion: "1.0.0",
    tag: values.tag,
    resolvedSha: resolvedSha,
    annotated: isAnnotated,
    signature: {
      present: false,
      verified: false,
      note: "Not checked",
    },
    tagger: null,
  };

  // 2. If Annotated, Extract Metadata & Check Signature
  if (isAnnotated) {
    // Get tag content
    const tagContent = runSilent(`git cat-file -p "${values.tag}"`);

    // Extract tagger info
    if (tagContent) {
      const taggerMatch = tagContent.match(/^tagger (.+) <(.+)> (\d+ [+-]\d+)/m);
      if (taggerMatch) {
        tagSafety.tagger = {
          name: taggerMatch[1],
          email: taggerMatch[2],
          date: new Date(parseInt(taggerMatch[3].split(" ")[0]) * 1000).toISOString(), // simplistic date parse
        };
      }
    }

    // Check Signature
    // Strategy 1: check for PGP block in content (presence)
    const hasSignatureBlock = tagContent && tagContent.includes("-----BEGIN PGP SIGNATURE-----");
    tagSafety.signature.present = !!hasSignatureBlock;

    // Strategy 2: git tag -v (verification)
    // We try to verify. If it fails, it might be due to missing key or bad sig.
    // We'll capture the output to determine which.
    try {
      execSync(`git tag -v "${values.tag}"`, { stdio: "pipe" });
      tagSafety.signature.verified = true;
      tagSafety.signature.note = "Verified successfully";
    } catch (e) {
      tagSafety.signature.verified = false;
      const stderr = e.stderr ? e.stderr.toString() : "";
      if (stderr.includes("error: no signature found")) {
        tagSafety.signature.note = "No signature found";
        tagSafety.signature.present = false; // Confirming presence check
      } else if (
        stderr.includes("No public key") ||
        stderr.includes("gpg: Can't check signature")
      ) {
        tagSafety.signature.note = "Verification unavailable (public key missing on runner)";
      } else {
        tagSafety.signature.note = "Verification failed (bad signature or other error)";
      }
    }
  } else {
    tagSafety.signature.note = "Lightweight tag (cannot be signed)";
  }

  // 3. Output Results
  if (!existsSync(DIST_RELEASE)) {
    mkdirSync(DIST_RELEASE, { recursive: true });
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(tagSafety, null, 2));
  console.log(`✅ Wrote tag safety report to: ${OUTPUT_FILE}`);

  // Summary for logs
  console.log(`   Annotated: ${tagSafety.annotated ? "YES" : "NO"}`);
  console.log(
    `   Signature: ${tagSafety.signature.present ? "PRESENT" : "NO"} (${tagSafety.signature.note})`
  );

  // 4. Enforcement
  if (values.enforce) {
    const errors = [];
    if (values["require-annotated"] && !tagSafety.annotated) {
      errors.push("Tag must be annotated.");
    }
    if (values["require-signed"] && !tagSafety.signature.present) {
      errors.push("Tag must be signed.");
    }

    if (errors.length > 0) {
      console.error("❌ Tag Safety Check Failed (Enforced):");
      errors.forEach((e) => console.error(`   - ${e}`));
      process.exit(1);
    }
  }
}

main();
