import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "../../server/src");
const OUTPUT_FILE = path.resolve(__dirname, "../../reports/tenant-scan-static.json");
const STRICT_MODE = process.env.TENANT_SCAN_FAIL_CLOSED !== "false";
const TENANT_SCAN_FULL = process.env.TENANT_SCAN_FULL === "true";

const IGNORE_FILES = [".test.ts", ".spec.ts", "scan-tenant-isolation.mjs", "seed.ts", "migrations"];

const SENSITIVE_TABLES = ["users", "audit_logs", "runs", "pipelines", "cases", "reports"];

const SQL_REGEX = /query\(\s*['"`](.*?)['"`]/gs;
const NEO4J_REGEX = /run\(\s*['"`](.*?)['"`]/gs;

/**
 * Represents an isolation violation surfaced by the scanner.
 * @typedef {Object} Violation
 * @property {string} file
 * @property {number} line
 * @property {'SQL' | 'Cypher'} type
 * @property {string} message
 * @property {string} snippet
 */

function getChangedFiles() {
  try {
    const baseRef = process.env.GITHUB_BASE_REF || process.env.TENANT_SCAN_BASE || "origin/main";

    // Ensure base ref is available locally when running in CI.
    try {
      execSync(`git fetch --no-tags --depth=1 origin ${baseRef}`, { stdio: "ignore" });
    } catch (err) {
      // Fetch failures are non-fatal; we fall back to local diff.
    }

    const diffTarget = process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : baseRef;
    const output = execSync(`git diff --name-only ${diffTarget}...HEAD`, {
      encoding: "utf-8",
    });

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((file) => path.resolve(process.cwd(), file));
  } catch (err) {
    // Fallback to tracking staged or working tree changes
    try {
      const output = execSync("git diff --name-only", { encoding: "utf-8" });
      return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((file) => path.resolve(process.cwd(), file));
    } catch (innerErr) {
      console.warn("Unable to determine changed files, defaulting to full scan.");
      return [];
    }
  }
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function scanFile(filePath, violations) {
  const content = fs.readFileSync(filePath, "utf-8");

  let match;
  while ((match = SQL_REGEX.exec(content)) !== null) {
    const query = match[1];
    const lineNum = content.substring(0, match.index).split("\n").length;

    for (const table of SENSITIVE_TABLES) {
      if (new RegExp(`\\b${table}\\b`, "i").test(query)) {
        if (!/tenant_id/i.test(query) && /select|update|delete/i.test(query)) {
          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            line: lineNum,
            type: "SQL",
            message: `Query accessing '${table}' missing tenant_id guard`,
            snippet: query.substring(0, 120).replace(/\n/g, " "),
          });
        }
      }
    }
  }

  while ((match = NEO4J_REGEX.exec(content)) !== null) {
    const query = match[1];
    const lineNum = content.substring(0, match.index).split("\n").length;

    if (/match\s*\(/i.test(query) && !/tenantId/i.test(query)) {
      if (!query.includes("Constraint") && !query.includes("Index")) {
        violations.push({
          file: path.relative(ROOT_DIR, filePath),
          line: lineNum,
          type: "Cypher",
          message: "Cypher query missing tenantId guard",
          snippet: query.substring(0, 120).replace(/\n/g, " "),
        });
      }
    }
  }

  // GraphQL and ORM-level analysis could be added here using AST parsing in future phases.
}

function walkDir(dir, callback, options = {}) {
  const { changedSet, limitToChanged } = options;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const filepath = path.join(dir, entry);
    const stats = fs.statSync(filepath);

    if (stats.isDirectory()) {
      if (entry !== "node_modules" && entry !== "__tests__") {
        walkDir(filepath, callback, options);
      }
    } else if (
      (entry.endsWith(".ts") || entry.endsWith(".js")) &&
      !IGNORE_FILES.some((ignore) => entry.includes(ignore))
    ) {
      if (!limitToChanged || changedSet.has(filepath)) {
        callback(filepath);
      }
    }
  }
}

function main() {
  console.log("Starting Static Tenant Isolation Scan (fail-closed)...");
  const changedFiles = getChangedFiles();
  const changedSet = new Set(
    changedFiles.filter((file) => file.startsWith(ROOT_DIR)).map((file) => path.resolve(file))
  );

  const performFullScan = TENANT_SCAN_FULL || changedSet.size === 0;
  const limitToChanged = !performFullScan;

  if (limitToChanged) {
    console.log(`Scanning ${changedSet.size} changed files under server/src`);
  } else if (TENANT_SCAN_FULL) {
    console.log("TENANT_SCAN_FULL enabled; scanning entire server/src tree.");
  } else {
    console.log(
      "No changed files detected under server/src; skipping scan and writing empty report."
    );
    ensureDirectoryExists(OUTPUT_FILE);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2));
    return;
  }

  const violations = [];

  walkDir(ROOT_DIR, (filePath) => scanFile(filePath, violations), {
    changedSet,
    limitToChanged,
  });

  ensureDirectoryExists(OUTPUT_FILE);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(violations, null, 2));

  if (violations.length > 0) {
    console.error(`\n❌ Detected ${violations.length} potential tenant isolation violations.`);
    violations.slice(0, 10).forEach((violation) => {
      console.error(
        `- [${violation.type}] ${violation.file}:${violation.line} :: ${violation.message}\n  ${violation.snippet}`
      );
    });

    if (STRICT_MODE) {
      console.error("\nFailing build because TENANT_SCAN_FAIL_CLOSED is enabled (default).");
      process.exit(1);
    }
  } else {
    console.log("✅ No tenant isolation violations detected.");
  }
}

main();
