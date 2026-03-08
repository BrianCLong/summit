"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_process_1 = __importDefault(require("node:process"));
const PATTERNS = [
    {
        id: 'jailbreak_ignore_instructions',
        regex: /ignore (all|any|previous|earlier) instructions/i,
        description: 'Contains jailbreaking bait encouraging instruction overrides.',
        severity: 'error',
    },
    {
        id: 'disable_safety',
        regex: /(bypass|disable|remove) (safety|guardrails|filters|policy)/i,
        description: 'Attempts to bypass model safeguards.',
        severity: 'error',
    },
    {
        id: 'exfiltrate_secrets',
        regex: /(share|send|exfiltrate).*(secret|api key|password|credential)/i,
        description: 'Prompts that ask models to disclose secrets.',
        severity: 'error',
    },
    {
        id: 'unbounded_execution',
        regex: /(run|execute).*(shell|command|script).*(without|ignore)/i,
        description: 'Encourages blind execution of commands.',
        severity: 'warning',
    },
    {
        id: 'impersonation',
        regex: /(impersonate|pretend to be).*(admin|user|person)/i,
        description: 'Prompts that request impersonation or identity spoofing.',
        severity: 'warning',
    },
];
const SUPPORTED_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);
function walkPromptFiles(dir) {
    const entries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const entryPath = node_path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkPromptFiles(entryPath));
        }
        else if (SUPPORTED_EXTENSIONS.has(node_path_1.default.extname(entry.name))) {
            files.push(entryPath);
        }
    }
    return files;
}
function scanFile(filePath) {
    const content = (0, node_fs_1.readFileSync)(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const findings = [];
    lines.forEach((line, index) => {
        PATTERNS.forEach((pattern) => {
            if (pattern.regex.test(line)) {
                findings.push({
                    file: filePath,
                    line: index + 1,
                    snippet: line.trim(),
                    patternId: pattern.id,
                    description: pattern.description,
                    severity: pattern.severity,
                });
            }
        });
    });
    return findings;
}
function parseArgs() {
    const args = node_process_1.default.argv.slice(2);
    const dirArgIndex = args.findIndex((arg) => arg === '--path');
    const promptDir = dirArgIndex !== -1 && args[dirArgIndex + 1]
        ? node_path_1.default.resolve(node_process_1.default.cwd(), args[dirArgIndex + 1])
        : node_path_1.default.resolve(node_process_1.default.cwd(), 'prompts/registry');
    return {
        promptDir,
        isCi: args.includes('--ci'),
    };
}
function ensureDirectoryExists(dir) {
    try {
        const stats = (0, node_fs_1.statSync)(dir);
        if (!stats.isDirectory()) {
            throw new Error(`${dir} is not a directory`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Prompt directory not found: ${message}`);
        node_process_1.default.exit(1);
    }
}
function main() {
    const { promptDir, isCi } = parseArgs();
    ensureDirectoryExists(promptDir);
    const promptFiles = walkPromptFiles(promptDir);
    if (!promptFiles.length) {
        console.warn(`No prompt files found under ${promptDir}.`);
        node_process_1.default.exit(0);
    }
    console.log(`Scanning ${promptFiles.length} prompt files in ${promptDir}...`);
    const findings = promptFiles.flatMap((filePath) => scanFile(filePath));
    if (!findings.length) {
        console.log('✅ No suspicious patterns detected in prompts.');
        return;
    }
    findings.forEach((finding) => {
        console.error(`[${finding.severity.toUpperCase()}] ${finding.file}:${finding.line} (${finding.patternId}) ${finding.description}\n  ↳ ${finding.snippet}`);
    });
    console.error(`Found ${findings.length} potential prompt issues.`);
    if (isCi) {
        node_process_1.default.exit(1);
    }
}
main();
