import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuration
// We assume we are in tools/debt-detector/src or tools/debt-detector
// We want to find the repository root.
function findRepoRoot(startDir: string): string {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
        if (fs.existsSync(path.join(currentDir, 'package.json')) &&
            fs.existsSync(path.join(currentDir, 'pnpm-lock.yaml'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    return process.cwd(); // fallback
}

const ROOT_DIR = findRepoRoot(__dirname);
const OUTPUT_DIR = path.join(ROOT_DIR, 'tools/debt-detector/output');
const REPORT_FILE = path.join(OUTPUT_DIR, 'REPORT.md');
const JSON_FILE = path.join(OUTPUT_DIR, 'debt.json');

const KEYWORDS = [
    'TODO', 'FIXME', 'NOTE', 'HACK', 'Sprint', 'XXX',
    'coming soon', 'future work', 'not implemented'
];

const IGNORE_DIRS = [
    'node_modules', '.git', 'dist', 'build', 'coverage',
    'output', // relative to debt-detector
    '.next', 'target', '.cache', 'out', 'tmp',
    '__pycache__', 'venv', '.venv', 'eggs', '.eggs',
    'generated', 'migrations'
];

const IGNORE_PATHS = [
    path.join(ROOT_DIR, 'tools/debt-detector/output'),
    path.join(ROOT_DIR, 'package-lock.json'),
    path.join(ROOT_DIR, 'pnpm-lock.yaml'),
    path.join(ROOT_DIR, 'yarn.lock'),
];

const EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.md', '.yml', '.yaml', '.json'
];

interface DebtItem {
    file: string;
    line: number;
    type: string;
    description: string;
    hash: string;
}

function scanFile(filepath: string): DebtItem[] {
    const items: DebtItem[] = [];
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const lines = content.split('\n');

        const keywordPattern = KEYWORDS.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
        const regex = new RegExp(`(${keywordPattern})[:\\s]+(.*)`, 'i');

        // Simple heuristic for missing imports (TS only)
        // Look for: import { X } from './path'; where ./path does not exist
        if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) {
             const importRegex = /import\s+.*from\s+['"](\..*)['"]/g;
             let importMatch;
             while ((importMatch = importRegex.exec(content)) !== null) {
                 const importPath = importMatch[1];
                 const dir = path.dirname(filepath);
                 // Check if resolved path exists
                 // This is basic and doesn't handle all resolution logic (index.ts, extensions)
                 // But it's a heuristic for "Referenced but Not Built"
                 const possibleExtensions = ['', '.ts', '.tsx', '.js', '.json', '/index.ts', '/index.tsx'];
                 let found = false;
                 for (const ext of possibleExtensions) {
                     if (fs.existsSync(path.join(dir, importPath + ext))) {
                         found = true;
                         break;
                     }
                 }
                 if (!found) {
                     items.push({
                         file: path.relative(ROOT_DIR, filepath),
                         line: 0, // Hard to get line number from global regex exec easily without re-scanning
                         type: 'MISSING_IMPORT',
                         description: `Import source '${importPath}' not found on disk.`,
                         hash: crypto.createHash('sha256').update(`${filepath}:missing:${importPath}`).digest('hex').substring(0, 12)
                     });
                 }
             }
        }

        lines.forEach((lineContent, index) => {
            if (lineContent.length > 500) return;

            const match = lineContent.match(regex);
            if (match) {
                const type = match[1].toUpperCase();
                let description = match[2].trim();
                description = description.replace(/^\*+\s*/, '').replace(/\*+\s*$/, '');

                if (description.length < 3) return;
                if (type === 'SPRINT' && /^\d+(\s|$)/.test(description)) return;

                const hash = crypto.createHash('sha256')
                    .update(`${filepath}:${index}:${description}`)
                    .digest('hex')
                    .substring(0, 12);

                items.push({
                    file: path.relative(ROOT_DIR, filepath),
                    line: index + 1,
                    type,
                    description,
                    hash
                });
            }
        });
    } catch (e) {
        // console.warn(`Failed to read ${filepath}:`, e);
    }
    return items;
}

function walkDir(dir: string, callback: (filepath: string) => void) {
    try {
        if (IGNORE_PATHS.includes(dir)) return;

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filepath = path.join(dir, file);
            if (IGNORE_PATHS.includes(filepath)) continue;

            try {
                const stats = fs.statSync(filepath);
                if (stats.isDirectory()) {
                    if (!IGNORE_DIRS.includes(file)) {
                        walkDir(filepath, callback);
                    }
                } else {
                    if (EXTENSIONS.includes(path.extname(file))) {
                        callback(filepath);
                    }
                }
            } catch (e) {
                // Ignore
            }
        }
    } catch (e) {
        // Ignore
    }
}

function main() {
    console.log(`Starting Debt Detector from root: ${ROOT_DIR}`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const allItems: DebtItem[] = [];

    walkDir(ROOT_DIR, (filepath) => {
        const items = scanFile(filepath);
        allItems.push(...items);
    });

    console.log(`Found ${allItems.length} items.`);

    fs.writeFileSync(JSON_FILE, JSON.stringify(allItems, null, 2));

    const reportContent = `# Technical Debt & Missing Features Report

**Generated on**: ${new Date().toISOString()}
**Total Items**: ${allItems.length}

This report serves as the authoritative record of detected technical debt, missing features, and potentially broken references.

## Breakdown by Type
${Object.entries(allItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
}, {} as Record<string, number>)).map(([type, count]) => `- **${type}**: ${count}`).join('\n')}

## Detailed Findings

| Type | File | Description |
|------|------|-------------|
${allItems.slice(0, 1000).map(item => `| ${item.type} | \`${item.file}${item.line > 0 ? ':' + item.line : ''}\` | ${item.description.replace(/\|/g, '\\|').substring(0, 100)} |`).join('\n')}

*(Truncated to first 1000 items. See \`debt.json\` for full list.)*

## Implied Enums/Interfaces & Broken Imports
The scanner now checks for broken local imports in TypeScript files, which often indicate an interface or enum that was referenced but not created.
`;

    fs.writeFileSync(REPORT_FILE, reportContent);
    console.log(`Report generated at ${REPORT_FILE}`);
}

main();
