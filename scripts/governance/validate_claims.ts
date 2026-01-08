import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to resolve paths relative to repo root
const repoRoot = path.resolve(__dirname, "../../");
const resolvePath = (p: string) => path.join(repoRoot, p);

const CLAIMS_FILE = resolvePath("docs/claims/CLAIMS_REGISTRY.md");

function fail(message: string) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function success(message: string) {
  console.log(`✅ ${message}`);
}

function validateClaims() {
  console.log(`🔍 Validating claims registry at: ${CLAIMS_FILE}`);

  if (!fs.existsSync(CLAIMS_FILE)) {
    fail(`Claims registry not found at ${CLAIMS_FILE}`);
  }

  const content = fs.readFileSync(CLAIMS_FILE, "utf-8");

  // Regex to find table rows with links: | ID | Claim | `Path` ...
  // This looks for rows that start with | **ABC-123** | ... | `path`
  // It specifically targets the "Evidence Path" column structure.
  const claimRowRegex = /\|\s*\*\*[A-Z]+-\d+\*\*\s*\|\s*[^|]+\s*\|\s*`([^`]+)`/g;

  let match;
  let count = 0;
  let errors = 0;

  while ((match = claimRowRegex.exec(content)) !== null) {
    count++;
    const relativePath = match[1];
    const fullPath = resolvePath(relativePath);

    let exists = false;
    try {
      exists = fs.existsSync(fullPath);
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      console.error(`❌ Claim Evidence Missing: ${relativePath}`);
      errors++;
    } else {
      // console.log(`   Verified: ${relativePath}`);
    }
  }

  if (count === 0) {
    fail("No claims found to validate. Check regex or file format.");
  }

  if (errors > 0) {
    fail(`Validation failed. ${errors} evidence paths are missing or invalid.`);
  }

  success(`All ${count} claims have valid evidence links.`);
}

validateClaims();
