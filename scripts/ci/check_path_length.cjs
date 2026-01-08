const fs = require('fs');
const path = require('path');

// Configure threshold (Windows MAX_PATH is 260, some tools fail at 256)
// Using 210 to be conservative and catch issues before they break things
const MAX_LENGTH = 210;
const root = process.cwd();
let failed = false;

// Ignore list
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.pnpm-store']);

function scan(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);

      // Calculate relative path for reporting and length check relative to root
      // (Assuming CI checkout is at root, but deep paths inside matter)
      const relPath = path.relative(root, fullPath);

      // Check length of the relative path + some buffer for standard checkout paths
      // In CI, checkout path might be /home/runner/work/repo/repo (approx 30 chars)
      // So absolute path would be ~30 + relPath.length.
      // If relPath > 210, total > 240, approaching danger zone.
      if (relPath.length > MAX_LENGTH) {
        console.error(`[PATH TOO LONG] Length ${relPath.length} > ${MAX_LENGTH}: ${relPath}`);
        failed = true;
      }

      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (IGNORE_DIRS.has(file)) continue;
          // Recursively scan
          scan(fullPath);
        }
      } catch (statErr) {
        console.warn(`Could not stat ${relPath}: ${statErr.message}`);
      }
    }
  } catch (e) {
    console.error(`Error scanning ${dir}: ${e.message}`);
  }
}

console.log(`Starting path length scan (Threshold: ${MAX_LENGTH} chars)...`);
console.log(`Root: ${root}`);

scan(root);

if (failed) {
  console.error("\n❌ FAILED: Found paths exceeding the length limit!");
  console.error("These paths may cause 'filename overflows max-path len' errors in CI artifact uploads/downloads.");
  console.error("Action required: Shorten directory names, flatten structure, or exclude these paths from build/artifacts.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All scanned paths are within the length limit.");
}
