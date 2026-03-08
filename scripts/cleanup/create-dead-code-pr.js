"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const projectRoot = process.cwd();
const defaultReportPath = path_1.default.join(projectRoot, 'reports', 'dead-code-report.json');
function parseArgs(argv) {
    const options = {
        reportPath: defaultReportPath,
        branchName: process.env.DEAD_CODE_BRANCH || 'feature/dead-code-detector-pr-bot-01',
        dryRun: true,
        maxDeletes: 50,
    };
    argv.forEach((arg) => {
        if (arg === '--execute' || arg === '--no-dry-run') {
            options.dryRun = false;
        }
        if (arg.startsWith('--report=')) {
            options.reportPath = path_1.default.resolve(projectRoot, arg.replace('--report=', ''));
        }
        if (arg.startsWith('--branch=')) {
            options.branchName = arg.replace('--branch=', '');
        }
        if (arg.startsWith('--max-deletes=')) {
            const parsed = Number.parseInt(arg.replace('--max-deletes=', ''), 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
                options.maxDeletes = parsed;
            }
        }
    });
    return options;
}
function loadReport(reportPath) {
    if (!fs_1.default.existsSync(reportPath)) {
        throw new Error(`Dead code report not found at ${reportPath}`);
    }
    return JSON.parse(fs_1.default.readFileSync(reportPath, 'utf8'));
}
function runCommand(command) {
    (0, child_process_1.execSync)(command, { stdio: 'inherit', cwd: projectRoot });
}
function ensureBranch(branchName) {
    try {
        (0, child_process_1.execSync)(`git rev-parse --verify ${branchName}`, { stdio: 'ignore', cwd: projectRoot });
        runCommand(`git checkout ${branchName}`);
    }
    catch {
        runCommand(`git checkout -b ${branchName}`);
    }
}
function buildPrBody(candidates, report, reportPath) {
    const bulletList = candidates
        .slice(0, 20)
        .map((candidate) => `- ${candidate.file}${candidate.symbolName ? ` :: ${candidate.symbolName}` : ''} (${candidate.reason})`)
        .join('\n');
    return [
        '# Dead-code cleanup (dry run)',
        '',
        `Generated from report ${path_1.default.relative(projectRoot, reportPath)}`,
        '',
        '## Proposed removals (high confidence)',
        bulletList || '- None identified',
        '',
        '## Policy',
        '- See docs/architecture/dead-code-policy.md',
        '',
        '_Dry-run mode: PR will not be opened until enabled._',
    ].join('\n');
}
function collectHighConfidence(report) {
    const combined = [...report.candidates.unusedExports, ...report.candidates.unreferencedModules];
    return combined.filter((candidate) => candidate.confidence === 'high');
}
function deleteTarget(filePath) {
    const fullPath = path_1.default.join(projectRoot, filePath);
    if (!fs_1.default.existsSync(fullPath)) {
        return;
    }
    const content = fs_1.default.readFileSync(fullPath, 'utf8');
    if (/@experimental|@keep|KEEP/.test(content)) {
        console.log(`Skipping protected file ${filePath}`);
        return;
    }
    fs_1.default.rmSync(fullPath, { recursive: true, force: true });
    runCommand(`git add ${JSON.stringify(filePath)}`);
}
function executeCleanup(branchName, candidates, maxDeletes) {
    ensureBranch(branchName);
    const deletions = candidates.filter((candidate) => candidate.type === 'unreferenced-module').slice(0, maxDeletes);
    if (deletions.length === 0) {
        console.log('No file-level deletions to apply.');
        return;
    }
    deletions.forEach((candidate) => deleteTarget(candidate.file));
    runCommand('pnpm lint');
    runCommand('pnpm typecheck');
    const resolvedReportPath = path_1.default.join(projectRoot, 'reports', 'dead-code-report.json');
    const prBody = buildPrBody(deletions, loadReport(resolvedReportPath), resolvedReportPath);
    const prTitle = 'cleanup: Dead-code detection & automated cleanup bot';
    try {
        runCommand(`gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}"`);
    }
    catch (error) {
        console.error('Failed to create PR automatically. Please create it manually.');
        console.error(error);
    }
}
function main() {
    const options = parseArgs(process.argv.slice(2));
    const report = loadReport(options.reportPath);
    const highConfidence = collectHighConfidence(report);
    if (highConfidence.length === 0) {
        console.log('No high-confidence dead code candidates found.');
        return;
    }
    console.log(`Found ${highConfidence.length} high-confidence candidates.`);
    highConfidence.forEach((candidate) => {
        console.log(` - ${candidate.type}: ${candidate.file}${candidate.symbolName ? ` (${candidate.symbolName})` : ''}`);
    });
    if (options.dryRun) {
        console.log('Dry-run enabled. No branch, deletion, or PR actions were taken.');
        console.log('Disable dry-run with --execute once the workflow is vetted.');
        return;
    }
    executeCleanup(options.branchName, highConfidence, options.maxDeletes);
}
main();
