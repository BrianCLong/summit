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
exports.runHarness = runHarness;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
function runHarness(options) {
    const { buildCommand, outputDir, cwd = process.cwd() } = options;
    const build1Dir = path.join(cwd, 'tmp-build-1');
    const build2Dir = path.join(cwd, 'tmp-build-2');
    // Helper to cleanup
    const cleanup = () => {
        fs.rmSync(build1Dir, { recursive: true, force: true });
        fs.rmSync(build2Dir, { recursive: true, force: true });
    };
    cleanup();
    try {
        // Build 1
        console.log(`Running Build 1: ${buildCommand}`);
        // Clear output dir first if it exists in source
        const targetOutputDir = path.join(cwd, outputDir);
        fs.rmSync(targetOutputDir, { recursive: true, force: true });
        (0, child_process_1.execSync)(buildCommand, { cwd, stdio: 'inherit' });
        // Move output to temp dir
        if (!fs.existsSync(targetOutputDir)) {
            return { success: false, report: [`Output directory ${outputDir} was not created by build command.`] };
        }
        fs.cpSync(targetOutputDir, build1Dir, { recursive: true });
        // Build 2
        console.log(`Running Build 2: ${buildCommand}`);
        fs.rmSync(targetOutputDir, { recursive: true, force: true });
        (0, child_process_1.execSync)(buildCommand, { cwd, stdio: 'inherit' });
        // Move output to temp dir
        if (!fs.existsSync(targetOutputDir)) {
            return { success: false, report: [`Output directory ${outputDir} was not created by build command (Run 2).`] };
        }
        fs.cpSync(targetOutputDir, build2Dir, { recursive: true });
        // Compare
        console.log('Comparing builds...');
        const diffs = compareDirectories(build1Dir, build2Dir);
        cleanup();
        if (diffs.length === 0) {
            return { success: true, report: [] };
        }
        else {
            return { success: false, report: diffs };
        }
    }
    catch (error) {
        cleanup();
        return { success: false, report: [`Build failed: ${error}`] };
    }
}
function compareDirectories(dir1, dir2) {
    const files1 = getAllFiles(dir1);
    const files2 = getAllFiles(dir2);
    const allFiles = new Set([...files1, ...files2]);
    const diffs = [];
    for (const file of allFiles) {
        const p1 = path.join(dir1, file);
        const p2 = path.join(dir2, file);
        if (!fs.existsSync(p1)) {
            diffs.push(`File missing in build 1: ${file}`);
            continue;
        }
        if (!fs.existsSync(p2)) {
            diffs.push(`File missing in build 2: ${file}`);
            continue;
        }
        const hash1 = getFileHash(p1);
        const hash2 = getFileHash(p2);
        if (hash1 !== hash2) {
            diffs.push(`Content mismatch: ${file}`);
        }
    }
    return diffs;
}
function getAllFiles(dir, baseDir = '') {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const relativePath = path.join(baseDir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath, relativePath));
        }
        else {
            results.push(relativePath);
        }
    }
    return results;
}
function getFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}
// CLI execution
if (process.argv[1] === __filename || process.argv[1].endsWith('harness.ts')) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: tsx harness.ts <build-command> <output-dir>');
        process.exit(1);
    }
    const [buildCommand, outputDir] = args;
    const result = runHarness({ buildCommand, outputDir });
    if (result.success) {
        console.log('Build is deterministic!');
        process.exit(0);
    }
    else {
        console.error('Build is NOT deterministic. Differences found:');
        result.report.forEach(r => console.error(`- ${r}`));
        process.exit(1);
    }
}
