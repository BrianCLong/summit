"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
exports.doctorCommand = new commander_1.Command('doctor')
    .description('Check development environment for Golden Path requirements')
    .action(async () => {
    console.log(chalk_1.default.cyan('\nGolden Path Platform - Environment Check\n'));
    const results = [];
    // Runtime checks
    results.push(...checkRuntime());
    // Tool checks
    results.push(...checkTools());
    // Configuration checks
    results.push(...(await checkConfiguration()));
    // Print results
    printResults(results);
    const failed = results.filter((r) => !r.passed).length;
    if (failed > 0) {
        console.log(chalk_1.default.yellow(`\n${failed} issue(s) found. See suggestions above.`));
        process.exit(1);
    }
    else {
        console.log(chalk_1.default.green('\nEnvironment is ready for Golden Path development!'));
    }
});
function checkRuntime() {
    const results = [];
    // Node.js version
    try {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
        const passed = majorVersion >= 18;
        results.push({
            name: 'Node.js version',
            passed,
            message: `${nodeVersion} ${passed ? '' : '(requires >= 18)'}`,
            suggestion: passed ? undefined : 'Install Node.js 18 or later: https://nodejs.org',
        });
    }
    catch {
        results.push({
            name: 'Node.js',
            passed: false,
            message: 'Not found',
            suggestion: 'Install Node.js: https://nodejs.org',
        });
    }
    // pnpm
    try {
        const pnpmVersion = (0, child_process_1.execSync)('pnpm --version', { encoding: 'utf-8' }).trim();
        const majorVersion = parseInt(pnpmVersion.split('.')[0], 10);
        const passed = majorVersion >= 8;
        results.push({
            name: 'pnpm version',
            passed,
            message: `${pnpmVersion} ${passed ? '' : '(requires >= 8)'}`,
            suggestion: passed ? undefined : 'Update pnpm: corepack enable && corepack prepare pnpm@latest --activate',
        });
    }
    catch {
        results.push({
            name: 'pnpm',
            passed: false,
            message: 'Not found',
            suggestion: 'Install pnpm: corepack enable && corepack prepare pnpm@latest --activate',
        });
    }
    return results;
}
function checkTools() {
    const results = [];
    // Docker
    try {
        const dockerVersion = (0, child_process_1.execSync)('docker --version', { encoding: 'utf-8' }).trim();
        results.push({
            name: 'Docker',
            passed: true,
            message: dockerVersion.split(',')[0].replace('Docker version ', ''),
        });
    }
    catch {
        results.push({
            name: 'Docker',
            passed: false,
            message: 'Not found',
            suggestion: 'Install Docker Desktop: https://www.docker.com/products/docker-desktop',
        });
    }
    // Git
    try {
        const gitVersion = (0, child_process_1.execSync)('git --version', { encoding: 'utf-8' }).trim();
        results.push({
            name: 'Git',
            passed: true,
            message: gitVersion.replace('git version ', ''),
        });
    }
    catch {
        results.push({
            name: 'Git',
            passed: false,
            message: 'Not found',
            suggestion: 'Install Git: https://git-scm.com',
        });
    }
    // kubectl (optional)
    try {
        const kubectlVersion = (0, child_process_1.execSync)('kubectl version --client --short 2>/dev/null || kubectl version --client', {
            encoding: 'utf-8',
        }).trim();
        results.push({
            name: 'kubectl',
            passed: true,
            message: kubectlVersion.split('\n')[0],
        });
    }
    catch {
        results.push({
            name: 'kubectl',
            passed: true, // Optional
            message: 'Not installed (optional for local development)',
        });
    }
    // helm (optional)
    try {
        const helmVersion = (0, child_process_1.execSync)('helm version --short', { encoding: 'utf-8' }).trim();
        results.push({
            name: 'Helm',
            passed: true,
            message: helmVersion,
        });
    }
    catch {
        results.push({
            name: 'Helm',
            passed: true, // Optional
            message: 'Not installed (optional for local development)',
        });
    }
    return results;
}
async function checkConfiguration() {
    const results = [];
    // Check if we're in a workspace
    const pnpmWorkspacePath = path_1.default.join(process.cwd(), 'pnpm-workspace.yaml');
    const inWorkspace = await fs_extra_1.default.pathExists(pnpmWorkspacePath);
    results.push({
        name: 'pnpm workspace',
        passed: inWorkspace,
        message: inWorkspace ? 'Found pnpm-workspace.yaml' : 'Not in a pnpm workspace',
        suggestion: inWorkspace ? undefined : 'Run from repository root or create pnpm-workspace.yaml',
    });
    // Check for turbo.json
    const turboPath = path_1.default.join(process.cwd(), 'turbo.json');
    const hasTurbo = await fs_extra_1.default.pathExists(turboPath);
    results.push({
        name: 'Turbo configuration',
        passed: hasTurbo,
        message: hasTurbo ? 'Found turbo.json' : 'turbo.json not found',
        suggestion: hasTurbo ? undefined : 'Initialize Turbo: pnpm add -D turbo',
    });
    // Check for .env file
    const envPath = path_1.default.join(process.cwd(), '.env');
    const hasEnv = await fs_extra_1.default.pathExists(envPath);
    results.push({
        name: 'Environment file',
        passed: hasEnv,
        message: hasEnv ? 'Found .env' : '.env not found',
        suggestion: hasEnv ? undefined : 'Copy .env.example to .env and configure',
    });
    // Check for tsconfig.base.json
    const tsconfigBasePath = path_1.default.join(process.cwd(), 'tsconfig.base.json');
    const hasTsconfigBase = await fs_extra_1.default.pathExists(tsconfigBasePath);
    results.push({
        name: 'TypeScript base config',
        passed: hasTsconfigBase,
        message: hasTsconfigBase ? 'Found tsconfig.base.json' : 'tsconfig.base.json not found',
        suggestion: hasTsconfigBase ? undefined : 'Create tsconfig.base.json for workspace TypeScript configuration',
    });
    // Check Docker is running
    try {
        (0, child_process_1.execSync)('docker info', { encoding: 'utf-8', stdio: 'pipe' });
        results.push({
            name: 'Docker daemon',
            passed: true,
            message: 'Running',
        });
    }
    catch {
        results.push({
            name: 'Docker daemon',
            passed: false,
            message: 'Not running',
            suggestion: 'Start Docker Desktop',
        });
    }
    return results;
}
function printResults(results) {
    for (const result of results) {
        const icon = result.passed ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
        const nameCol = result.name.padEnd(25);
        console.log(`${icon} ${nameCol} ${result.message}`);
        if (result.suggestion) {
            console.log(chalk_1.default.gray(`  → ${result.suggestion}`));
        }
    }
}
