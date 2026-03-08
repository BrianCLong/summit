"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Helper to resolve paths relative to repo root
const repoRoot = path_1.default.resolve(__dirname, '../../');
const resolvePath = (p) => path_1.default.join(repoRoot, p);
const CLAIMS_FILE = resolvePath('docs/claims/CLAIMS_REGISTRY.md');
function fail(message) {
    console.error(`❌ ${message}`);
    process.exit(1);
}
function success(message) {
    console.log(`✅ ${message}`);
}
function validateClaims() {
    console.log(`🔍 Validating claims registry at: ${CLAIMS_FILE}`);
    if (!fs_1.default.existsSync(CLAIMS_FILE)) {
        fail(`Claims registry not found at ${CLAIMS_FILE}`);
    }
    const content = fs_1.default.readFileSync(CLAIMS_FILE, 'utf-8');
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
            exists = fs_1.default.existsSync(fullPath);
        }
        catch (e) {
            exists = false;
        }
        if (!exists) {
            console.error(`❌ Claim Evidence Missing: ${relativePath}`);
            errors++;
        }
        else {
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
