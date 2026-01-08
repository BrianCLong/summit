#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";

const options = {
  dir: { type: "string", default: "dist/release" },
  "supported-major": { type: "string", default: "1" },
  strict: { type: "boolean", default: true },
};

const { values } = parseArgs({ options, strict: false });
const BUNDLE_DIR = resolve(values.dir);
const SUPPORTED_MAJOR = parseInt(values["supported-major"], 10);
const STRICT = values.strict;

const FILES_TO_CHECK = [
  "release-status.json",
  "bundle-index.json",
  "release-manifest.json",
  "provenance.json",
  "digests.json",
];

const compatibility = {
  schemaVersion: "1.0.0",
  supportedMajor: SUPPORTED_MAJOR,
  ok: true,
  checked: [],
  errors: [],
};

console.log(`🔍 Checking bundle compatibility in: ${BUNDLE_DIR}`);
console.log(`   Supported Major Version: ${SUPPORTED_MAJOR}`);

if (!existsSync(BUNDLE_DIR)) {
  console.error(`❌ Bundle directory not found: ${BUNDLE_DIR}`);
  if (STRICT) process.exit(1);
} else {
  for (const file of FILES_TO_CHECK) {
    const filePath = join(BUNDLE_DIR, file);
    // Ensure POSIX paths for reporting consistency
    const relPath = join(values.dir, file).split("\\").join("/");

    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const json = JSON.parse(content);

        if (json.schemaVersion) {
          // Parse semver major
          const majorMatch = String(json.schemaVersion).match(/^(\d+)/);
          if (majorMatch) {
            const major = parseInt(majorMatch[1], 10);
            const checkResult = {
              file: relPath,
              schemaVersion: json.schemaVersion,
              ok: major === SUPPORTED_MAJOR,
            };
            compatibility.checked.push(checkResult);

            if (major !== SUPPORTED_MAJOR) {
              compatibility.ok = false;
              const error = {
                code: "SCHEMA_MAJOR_UNSUPPORTED",
                file: relPath,
                found: json.schemaVersion,
                supportedMajor: SUPPORTED_MAJOR,
              };
              compatibility.errors.push(error);
              console.error(
                `❌ ${file}: Unsupported schema major version ${major} (expected ${SUPPORTED_MAJOR})`
              );
            } else {
              console.log(`✅ ${file}: ${json.schemaVersion}`);
            }
          } else {
            console.error(`❌ ${file}: Could not parse major version from "${json.schemaVersion}"`);
            compatibility.ok = false;
            compatibility.errors.push({
              code: "SCHEMA_VERSION_INVALID",
              file: relPath,
              found: json.schemaVersion,
              supportedMajor: SUPPORTED_MAJOR,
            });
          }
        } else {
          // No schemaVersion
          console.log(`⚠️ ${file}: No schemaVersion found. Skipping.`);
        }
      } catch (e) {
        console.error(`❌ ${file}: JSON parse error: ${e.message}`);
        compatibility.ok = false;
        compatibility.errors.push({
          code: "JSON_PARSE_ERROR",
          file: relPath,
          message: e.message,
        });
      }
    }
  }
}

// Write report
if (existsSync(BUNDLE_DIR)) {
  const reportPath = join(BUNDLE_DIR, "compatibility.json");
  writeFileSync(reportPath, JSON.stringify(compatibility, null, 2));
  console.log(`\n📄 Compatibility report written to ${reportPath}`);
}

// Step Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = compatibility.ok
    ? `Compatibility: PASS (major=${SUPPORTED_MAJOR})`
    : `Compatibility: FAIL - ${compatibility.errors.length > 0 ? compatibility.errors[0].file + " (" + compatibility.errors[0].found + ")" : "Unknown Error"}`;

  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${summary}\n`);
  } catch (e) {
    // ignore
  }
}

if (STRICT && !compatibility.ok) {
  console.error(`\n❌ Compatibility check failed.`);
  process.exit(1);
} else {
  if (!compatibility.ok) {
    console.warn(`\n⚠️ Compatibility check failed, but strict mode is off.`);
  } else {
    console.log(`\n✨ Compatibility check passed.`);
  }
  process.exit(0);
}
