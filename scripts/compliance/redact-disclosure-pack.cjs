#!/usr/bin/env node
/**
 * Disclosure Pack Redaction Script
 *
 * Scans and redacts PII and secrets from disclosure pack directories.
 * Uses both literal denylist entries and regex-based secret patterns.
 *
 * Usage:
 *   node scripts/compliance/redact-disclosure-pack.cjs <pack-dir>
 *   node scripts/compliance/redact-disclosure-pack.cjs <pack-dir> --denylist <path> --patterns <path>
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_DENYLIST = path.resolve(__dirname, "../../compliance/pii-denylist.txt");
const DEFAULT_PATTERNS = path.resolve(__dirname, "../../compliance/secret-patterns.json");

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".csv",
  ".log",
  ".sha256",
  ".spdx",
  ".xml",
  ".html",
  ".htm",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".css",
  ".scss",
  ".sh",
  ".bash",
  ".env",
  ".conf",
  ".cfg",
  ".ini",
  ".toml",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".zip",
  ".gz",
  ".tar",
  ".tgz",
  ".bz2",
  ".xz",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
]);

/**
 * Load denylist entries from a text file
 */
function loadDenylist(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Denylist file not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Load secret patterns from a JSON file
 */
function loadPatterns(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Patterns file not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, "utf8");
  const patterns = JSON.parse(content);
  if (!Array.isArray(patterns)) {
    throw new Error(`Pattern file must be an array: ${filePath}`);
  }
  return patterns.map((entry) => {
    const flags = entry.flags ?? "g";
    return {
      name: entry.name ?? "pattern",
      pattern: entry.pattern,
      replacement: entry.replacement ?? "[REDACTED]",
      regex: new RegExp(entry.pattern, flags),
    };
  });
}

/**
 * Determine if a file should be treated as text
 */
function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return false;
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }
  // Default: treat extensionless or unknown as text
  return ext.length === 0;
}

/**
 * Redact content using denylist and patterns
 */
function redactContent(content, denylist, patterns) {
  let redacted = content;
  const matches = [];

  // Apply denylist terms
  for (const term of denylist) {
    if (redacted.includes(term)) {
      const count = (redacted.match(new RegExp(escapeRegex(term), "g")) || []).length;
      redacted = redacted.split(term).join("[REDACTED]");
      matches.push({ type: "denylist", term, count });
    }
  }

  // Apply regex patterns
  for (const patternDef of patterns) {
    const beforeLength = redacted.length;
    const patternMatches = redacted.match(patternDef.regex);
    if (patternMatches && patternMatches.length > 0) {
      redacted = redacted.replace(patternDef.regex, patternDef.replacement);
      matches.push({
        type: "pattern",
        name: patternDef.name,
        count: patternMatches.length,
      });
    }
  }

  return { redacted, matches };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Recursively walk a directory
 */
function* walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

/**
 * Process a directory, redacting all text files
 */
function processDirectory(dir, denylist, patterns, options = {}) {
  const { dryRun = false, verbose = false } = options;
  const stats = {
    filesProcessed: 0,
    filesModified: 0,
    totalMatches: 0,
    errors: [],
  };

  for (const filePath of walkDir(dir)) {
    if (!isTextFile(filePath)) {
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const { redacted, matches } = redactContent(content, denylist, patterns);

      stats.filesProcessed++;

      if (matches.length > 0) {
        stats.filesModified++;
        stats.totalMatches += matches.reduce((sum, m) => sum + m.count, 0);

        if (verbose) {
          console.log(`\nRedactions in ${filePath}:`);
          for (const match of matches) {
            if (match.type === "denylist") {
              console.log(`  - Denylist term "${match.term}": ${match.count} occurrences`);
            } else {
              console.log(`  - Pattern "${match.name}": ${match.count} occurrences`);
            }
          }
        }

        if (!dryRun) {
          fs.writeFileSync(filePath, redacted, "utf8");
        }
      }
    } catch (error) {
      stats.errors.push({ file: filePath, error: error.message });
    }
  }

  return stats;
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: node redact-disclosure-pack.cjs <directory> [options]

Options:
  --denylist <path>   Path to PII denylist file (default: compliance/pii-denylist.txt)
  --patterns <path>   Path to secret patterns JSON (default: compliance/secret-patterns.json)
  --dry-run           Show what would be redacted without modifying files
  --verbose           Show detailed redaction information
  --help, -h          Show this help message
`);
    process.exit(0);
  }

  const dir = args[0];
  let denylistPath = DEFAULT_DENYLIST;
  let patternsPath = DEFAULT_PATTERNS;
  let dryRun = false;
  let verbose = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--denylist" && args[i + 1]) {
      denylistPath = args[++i];
    } else if (args[i] === "--patterns" && args[i + 1]) {
      patternsPath = args[++i];
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--verbose") {
      verbose = true;
    }
  }

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  console.log(`Redacting disclosure pack: ${dir}`);
  console.log(`Denylist: ${denylistPath}`);
  console.log(`Patterns: ${patternsPath}`);
  if (dryRun) {
    console.log("Mode: DRY RUN (no files will be modified)");
  }
  console.log("");

  const denylist = loadDenylist(denylistPath);
  const patterns = loadPatterns(patternsPath);

  console.log(`Loaded ${denylist.length} denylist terms`);
  console.log(`Loaded ${patterns.length} secret patterns`);
  console.log("");

  const stats = processDirectory(dir, denylist, patterns, { dryRun, verbose });

  console.log("\n--- Summary ---");
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Total redactions: ${stats.totalMatches}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    for (const err of stats.errors) {
      console.log(`  - ${err.file}: ${err.error}`);
    }
    process.exit(1);
  }

  if (stats.totalMatches > 0 && !dryRun) {
    console.log("\nRedaction complete. Please review modified files before shipping.");
  }

  process.exit(0);
}

// Export for testing
module.exports = {
  loadDenylist,
  loadPatterns,
  redactContent,
  isTextFile,
  processDirectory,
};

// Run if called directly
if (require.main === module) {
  main();
}
