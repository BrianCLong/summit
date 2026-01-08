import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Simple script to validate extensions
// Usage: node scripts/check_extensions.ts

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSIONS_DIR = path.join(__dirname, "../server/src/extensions");

async function main() {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    console.log("No extensions directory found.");
    return;
  }

  const files = fs.readdirSync(EXTENSIONS_DIR).filter((f) => f.endsWith(".ts") && f !== "types.ts");
  let success = true;

  for (const file of files) {
    const fullPath = path.join(EXTENSIONS_DIR, file);
    // Skip checking this script itself or unrelated files if any
    if (file.includes("check_extensions")) continue;

    // Let's do a static check using grep/regex for simplicity in this sandbox
    // since dynamic import of TS files in this runtime might be tricky without full build.
    const content = fs.readFileSync(fullPath, "utf-8");

    if (!content.includes("manifest:")) {
      console.error(`FAIL: ${file} missing 'manifest' property.`);
      success = false;
    }
    if (!content.includes("initialize")) {
      console.error(`FAIL: ${file} missing 'initialize' method.`);
      success = false;
    }
  }

  if (!success) {
    console.error("Extension validation failed");
    process.exit(1);
  }
  console.log("All extensions passed static checks.");
}

main().catch(console.error);
