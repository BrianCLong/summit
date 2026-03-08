"use strict";
// scripts/sec/watch_mcp_advisories.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAdvisories = checkAdvisories;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const KNOWN_VULNERABLE_VERSIONS = {
    '@modelcontextprotocol/sdk': ['0.1.0', '0.2.0'], // Hypothetical
    'git-mcp': ['0.1.0'] // Example from the prompt (Anthropic Git MCP server incident)
};
async function checkAdvisories() {
    console.log('🛡️  Scanning for MCP supply-chain advisories...');
    const rootPackageJsonPath = path_1.default.resolve(__dirname, '../../package.json');
    if (!fs_1.default.existsSync(rootPackageJsonPath)) {
        console.error('❌ Could not find package.json');
        process.exit(1);
    }
    const packageJson = JSON.parse(fs_1.default.readFileSync(rootPackageJsonPath, 'utf8'));
    const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.pnpm?.overrides // Check overrides too
    };
    let foundIssues = false;
    for (const [pkg, version] of Object.entries(allDeps)) {
        if (KNOWN_VULNERABLE_VERSIONS[pkg]) {
            // Very basic version check (string match for now)
            // In a real script, use semver logic
            const vulnerableVersions = KNOWN_VULNERABLE_VERSIONS[pkg];
            if (vulnerableVersions.includes(version)) {
                console.error(`🚨 DETECTED VULNERABLE PACKAGE: ${pkg}@${version}`);
                console.error(`   Advisory: Known critical vulnerability in this version.`);
                foundIssues = true;
            }
            else {
                console.log(`✅ Checked ${pkg}: version ${version} appears safe.`);
            }
        }
    }
    // Also check for specific lockfile entries if needed (mocked here)
    if (foundIssues) {
        console.error('❌ Security check failed. Please upgrade vulnerable packages.');
        process.exit(1);
    }
    else {
        console.log('✅ No known MCP advisories found in direct dependencies.');
    }
}
// Allow running directly
if (process.argv[1] === (0, url_1.fileURLToPath)(import.meta.url)) {
    checkAdvisories().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
