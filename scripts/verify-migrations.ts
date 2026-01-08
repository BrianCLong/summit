import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { glob } from "glob";

import { computeSchemaFingerprint, SchemaFingerprint } from "./schema-fingerprint.js";
import { DEFAULT_IGNORES, loadSchemaRegistries, SchemaRegistry } from "./schema-registry.js";

interface VerificationResult {
  schemaChanges: string[];
  migrationChanges: string[];
  fingerprintChanged: boolean;
}

function normalizePath(filePath: string): string {
  return path.posix.normalize(filePath.replace(/\\/g, "/"));
}

function getChangedFiles(baseRef: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: "utf8" });
    return output.split("\n").filter(Boolean).map(normalizePath);
  } catch (error) {
    console.warn(
      `Unable to diff against ${baseRef}, falling back to HEAD~1. Details: ${String(error)}`
    );
    const fallback = execSync("git diff --name-only HEAD~1", { encoding: "utf8" });
    return fallback.split("\n").filter(Boolean).map(normalizePath);
  }
}

async function collectFromRegistries(
  registries: SchemaRegistry[],
  key: "schemaGlobs" | "migrationGlobs"
) {
  const set = new Set<string>();

  for (const registry of registries) {
    for (const pattern of registry[key]) {
      const matches = await glob(pattern, {
        ignore: DEFAULT_IGNORES,
        posix: true,
      });
      matches.forEach((match) => set.add(normalizePath(match)));
    }
  }

  return set;
}

async function readStoredFingerprint(filePath: string): Promise<SchemaFingerprint | undefined> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as SchemaFingerprint;
  } catch (error) {
    console.warn(`No stored fingerprint found at ${filePath}: ${String(error)}`);
    return undefined;
  }
}

async function verify(baseRef: string): Promise<VerificationResult> {
  const registries = await loadSchemaRegistries();
  const changedFiles = getChangedFiles(baseRef);
  const schemaUniverse = await collectFromRegistries(registries, "schemaGlobs");
  const migrationUniverse = await collectFromRegistries(registries, "migrationGlobs");

  const schemaChanges = changedFiles.filter((file) => schemaUniverse.has(file));
  const migrationChanges = changedFiles.filter((file) => migrationUniverse.has(file));

  const targetFingerprintPath = path.resolve(process.cwd(), "schema-fingerprints", "latest.json");
  const storedFingerprint = await readStoredFingerprint(targetFingerprintPath);
  const currentFingerprint = await computeSchemaFingerprint(process.cwd());
  const fingerprintChanged = storedFingerprint?.compositeHash !== currentFingerprint.compositeHash;

  if (fingerprintChanged) {
    await fs.mkdir(path.dirname(targetFingerprintPath), { recursive: true });
    await fs.writeFile(targetFingerprintPath, JSON.stringify(currentFingerprint, null, 2));
  }

  return { schemaChanges, migrationChanges, fingerprintChanged };
}

function assertConditions(result: VerificationResult) {
  const failures: string[] = [];

  if (result.schemaChanges.length > 0 && result.migrationChanges.length === 0) {
    failures.push(
      "Schema files changed without a corresponding migration. Use scripts/create-migration.ts to add one."
    );
  }

  if (result.fingerprintChanged) {
    failures.push(
      "Schema fingerprint drift detected. Regenerate via scripts/schema-fingerprint.ts --write latest."
    );
  }

  if (failures.length > 0) {
    console.error("Schema governance checks failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("Schema governance checks passed.");
  }
}

async function main() {
  const baseRef = process.env.SCHEMA_DRIFT_BASE || "origin/main";
  const result = await verify(baseRef);

  if (result.schemaChanges.length > 0) {
    console.log(`Detected schema-related changes: ${result.schemaChanges.join(", ")}`);
  }

  if (result.migrationChanges.length > 0) {
    console.log(`Detected migration changes: ${result.migrationChanges.join(", ")}`);
  }

  if (result.fingerprintChanged) {
    console.log("Schema fingerprint was updated to reflect current tree.");
  }

  assertConditions(result);
}

main().catch((error) => {
  console.error("Schema verification failed:", error);
  process.exitCode = 1;
});
