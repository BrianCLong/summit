"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const commander_1 = require("commander");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_OUT_DIR = 'dist';
const collectArtifacts = (workspaces, outDir) => {
    const collectedFiles = [];
    fs.mkdirSync(outDir, { recursive: true });
    for (const workspace of workspaces) {
        const distPath = path.join(workspace.path, 'dist');
        if (fs.existsSync(distPath)) {
            const packageOutDir = path.join(outDir, workspace.name);
            fs.mkdirSync(packageOutDir, { recursive: true });
            const files = fs.readdirSync(distPath);
            for (const file of files) {
                const srcFile = path.join(distPath, file);
                const destFile = path.join(packageOutDir, file);
                fs.copyFileSync(srcFile, destFile);
                collectedFiles.push(destFile);
            }
        }
    }
    return collectedFiles;
};
const main = () => {
    commander_1.program
        .option('--dry-run', 'Simulate the build and packaging process')
        .option('--out-dir <dir>', 'Output directory for artifacts', DEFAULT_OUT_DIR)
        .parse(process.argv);
    const options = commander_1.program.opts();
    const outDir = path.resolve(options.outDir);
    if (options.dryRun) {
        console.log('**DRY RUN**');
    }
    console.log('Starting build process...');
    if (!options.dryRun) {
        (0, child_process_1.execSync)('pnpm install', { stdio: 'inherit' });
        (0, child_process_1.execSync)('pnpm build', { stdio: 'inherit' });
    }
    console.log('Build process complete.');
    console.log('Collecting artifacts...');
    const workspaces = JSON.parse((0, child_process_1.execSync)('pnpm m ls --json --depth=-1').toString());
    const artifacts = options.dryRun ? ['dry-run-artifact.txt'] : collectArtifacts(workspaces, outDir);
    console.log(`Collected ${artifacts.length} artifacts.`);
    console.log('Generating manifest and checksums...');
    const manifest = {
        artifacts: {},
        metadata: {
            timestamp: new Date().toISOString(),
            git_sha: (0, child_process_1.execSync)('git rev-parse HEAD').toString().trim(),
            node_version: process.version,
            pnpm_version: (0, child_process_1.execSync)('pnpm -v').toString().trim(),
        },
    };
    let checksums = '';
    for (const artifact of artifacts) {
        const content = options.dryRun ? 'dry-run' : fs.readFileSync(artifact);
        const sha256 = crypto.createHash('sha256').update(content).digest('hex');
        const relativePath = path.relative(outDir, artifact);
        manifest.artifacts[relativePath] = { sha256 };
        checksums += `${sha256}  ${relativePath}\n`;
    }
    const manifestPath = path.join(outDir, 'manifest.json');
    const checksumsPath = path.join(outDir, 'checksums.txt');
    if (!options.dryRun) {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        fs.writeFileSync(checksumsPath, checksums);
    }
    console.log('Manifest generated at:', manifestPath);
    console.log(JSON.stringify(manifest, null, 2));
    console.log('Checksums generated at:', checksumsPath);
    console.log(checksums);
    console.log('Artifact build process complete.');
};
main();
