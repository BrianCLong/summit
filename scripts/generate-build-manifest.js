"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || 'artifacts';
if (!fs_1.default.existsSync(ARTIFACTS_DIR)) {
    fs_1.default.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
function getCommitSha() {
    return process.env.GITHUB_SHA || (0, child_process_1.execSync)('git rev-parse HEAD').toString().trim();
}
function getBranch() {
    return process.env.GITHUB_REF_NAME || (0, child_process_1.execSync)('git rev-parse --abbrev-ref HEAD').toString().trim();
}
function getBuildTimestamp() {
    return new Date().toISOString();
}
const manifest = {
    repo: process.env.GITHUB_REPOSITORY || 'BrianCLong/summit',
    commit: getCommitSha(),
    branch: getBranch(),
    buildNumber: process.env.GITHUB_RUN_ID || 'local',
    builtAt: getBuildTimestamp(),
    nodeVersion: process.version,
    pnpmVersion: (0, child_process_1.execSync)('pnpm --version').toString().trim(),
    artifacts: [],
};
// Process arguments for artifacts: name:path:sbom
// Example: node generate-build-manifest.js server:dist/server.js:sbom.json
const args = process.argv.slice(2);
args.forEach(arg => {
    const [name, filePath, sbomPath] = arg.split(':');
    manifest.artifacts.push({
        name,
        path: filePath,
        sbom: sbomPath
    });
});
const manifestPath = path_1.default.join(ARTIFACTS_DIR, `build-manifest.${manifest.commit.substring(0, 7)}.json`);
fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Build manifest generated at ${manifestPath}`);
