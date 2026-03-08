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
const ROOT_DIR = path_1.default.resolve(__dirname, '../../');
const EXCEPTION_REGISTER_PATH = path_1.default.join(ROOT_DIR, 'docs/governance/EXCEPTION_REGISTER.md');
const SKIP_PATTERNS = [
    'test.skip',
    'describe.skip',
    'it.skip',
    'pytest.skip',
    '// @ts-ignore',
    'eslint-disable',
];
function scanDir(dir, fileList = []) {
    const files = fs_1.default.readdirSync(dir);
    files.forEach(file => {
        if (file.startsWith('.') || file === 'node_modules' || file === 'dist' || file === 'build' || file === 'coverage') {
            return;
        }
        const filePath = path_1.default.join(dir, file);
        const stat = fs_1.default.statSync(filePath);
        if (stat.isDirectory()) {
            scanDir(filePath, fileList);
        }
        else {
            if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}
function scanFile(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const findings = [];
    lines.forEach((line, index) => {
        for (const pattern of SKIP_PATTERNS) {
            if (line.includes(pattern)) {
                findings.push({
                    file: path_1.default.relative(ROOT_DIR, filePath),
                    line: index + 1,
                    content: line.trim(),
                    pattern
                });
                break; // Count once per line
            }
        }
    });
    return findings;
}
function parseExistingRegister(content) {
    const map = new Map();
    const lines = content.split('\n');
    let inTable = false;
    for (const line of lines) {
        if (line.includes('| File | Line | Pattern |')) {
            inTable = true;
            continue;
        }
        if (!inTable)
            continue;
        if (line.trim().startsWith('|--'))
            continue;
        if (!line.trim().startsWith('|'))
            break;
        const parts = line.split('|').map(s => s.trim()).filter(s => s !== '');
        if (parts.length >= 5) {
            // Expected format: | `file` | line | `pattern` | justification | sunset |
            const file = parts[0].replace(/`/g, '');
            const lineNum = parts[1];
            const justification = parts[3];
            const sunset = parts[4];
            const key = `${file}:${lineNum}`;
            map.set(key, { justification, sunset });
        }
    }
    return map;
}
function generateMarkdown(findings, existingData) {
    const date = new Date().toISOString().split('T')[0];
    let md = `# Exception Register\n\n`;
    md += `**Last Updated:** ${date}\n\n`;
    md += `This document lists all known deviations from the "Definition of Done".\n`;
    md += `These are intentional exceptions that must be justified and eventually resolved.\n\n`;
    md += `## Soft Spot Summary\n\n`;
    md += `| Category | Count |\n`;
    md += `| :--- | :---: |\n`;
    const stats = new Map();
    SKIP_PATTERNS.forEach(p => stats.set(p, 0));
    findings.forEach(f => {
        const current = stats.get(f.pattern) || 0;
        stats.set(f.pattern, current + 1);
    });
    SKIP_PATTERNS.forEach(p => {
        md += `| \`${p}\` | ${stats.get(p)} |\n`;
    });
    md += `| **Total** | **${findings.length}** |\n\n`;
    md += `## Detailed Findings\n\n`;
    md += `| File | Line | Pattern | Justification | Sunset Condition |\n`;
    md += `| :--- | :---: | :--- | :--- | :--- |\n`;
    findings.forEach(f => {
        const key = `${f.file}:${f.line}`;
        const existing = existingData.get(key);
        const justification = existing ? existing.justification : '_Pending_';
        const sunset = existing ? existing.sunset : '_TBD_';
        md += `| \`${f.file}\` | ${f.line} | \`${f.pattern}\` | ${justification} | ${sunset} |\n`;
    });
    md += `\n---\n`;
    md += `> **Control: Exception Register generated.**\n`;
    md += `> **Status: VERIFIED**\n`;
    return md;
}
function main() {
    console.log('Scanning codebase for soft spots...');
    // Load existing data if available
    let existingData = new Map();
    if (fs_1.default.existsSync(EXCEPTION_REGISTER_PATH)) {
        console.log('Loading existing register to preserve metadata...');
        const content = fs_1.default.readFileSync(EXCEPTION_REGISTER_PATH, 'utf-8');
        existingData = parseExistingRegister(content);
    }
    const allFiles = scanDir(ROOT_DIR);
    let allFindings = [];
    allFiles.forEach(file => {
        allFindings = allFindings.concat(scanFile(file));
    });
    console.log(`Found ${allFindings.length} soft spots.`);
    const markdown = generateMarkdown(allFindings, existingData);
    fs_1.default.writeFileSync(EXCEPTION_REGISTER_PATH, markdown);
    console.log(`Wrote register to ${EXCEPTION_REGISTER_PATH}`);
}
main();
