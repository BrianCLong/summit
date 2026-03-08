"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Script to check for compliance drift
// 1. Validates that all artifacts referenced in control-map.yaml exist.
// 2. Uses regex to parse YAML to avoid dependency issues in this environment.
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const ROOT_DIR = path_1.default.resolve(__dirname, '../../');
const CONTROL_MAP_PATH = path_1.default.join(ROOT_DIR, 'compliance/control-map.yaml');
function checkDrift() {
    console.log('Starting Compliance Drift Check...');
    console.log(`Root Dir: ${ROOT_DIR}`);
    if (!fs_1.default.existsSync(CONTROL_MAP_PATH)) {
        console.error(`CRITICAL: Control map not found at ${CONTROL_MAP_PATH}`);
        process.exit(1);
    }
    const fileContents = fs_1.default.readFileSync(CONTROL_MAP_PATH, 'utf8');
    // Regex to find "summit_artifacts:" blocks and the list items below them
    // This is a simple parser and assumes standard formatting.
    const artifactRegex = /summit_artifacts:\s*([\s\S]*?)(?=\n\s*\w+:|$)/g;
    const listRegex = /-\s*"([^"]+)"|-\s*([^\s]+)/g;
    let errors = 0;
    let checks = 0;
    let match;
    while ((match = artifactRegex.exec(fileContents)) !== null) {
        const block = match[1];
        let listMatch;
        while ((listMatch = listRegex.exec(block)) !== null) {
            const artifact = listMatch[1] || listMatch[2];
            if (artifact) {
                checks++;
                const artifactPath = path_1.default.join(ROOT_DIR, artifact);
                // Remove trailing slash if it was meant to be a directory check
                const cleanPath = artifactPath.endsWith('/') || artifactPath.endsWith('\\')
                    ? artifactPath.slice(0, -1)
                    : artifactPath;
                if (!fs_1.default.existsSync(cleanPath)) {
                    console.error(`[DRIFT] Mapped artifact not found: ${artifact}`);
                    errors++;
                }
            }
        }
    }
    console.log(`Drift Check Complete. Verified ${checks} artifacts.`);
    if (errors > 0) {
        console.error(`FAILED: Found ${errors} drift instances.`);
        process.exit(1);
    }
    else {
        console.log('PASSED: No drift detected.');
    }
}
checkDrift();
